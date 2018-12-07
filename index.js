const args = require('minimist')(process.argv.slice(2));
const defaultsDeep = require('lodash/defaultsDeep');
const EventEmitter = require('events').EventEmitter;
const {unflatten} = require('flat');
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');


/**
 * The root directory of the code that is being run right now.
 */
const cwd = args.c || args.cwd || process.env.NODE_CWD || process.cwd();

/**
 * Configurations will be loaded based on the prefix given through the tier, meaning that tier d would resolve to
 * the file that starts with d (excluding the default and override files).
 * Default files can be specified using command line arguments, environment variables, or using the reload
 * functionality:
 *
 * Arguments will be parsed longest to shortest so that you can override shorter arguments to your program if you want.
 * This means that you can call your program with the flag '-d config/' or '--directory config/ -d myopt' and it will
 * still function while you use your own arguments.
 *
 * Environment variables will be read from process.env and can be set however your systems sets up variables.
 *
 * Options:
 * directory:   NODE_CONF_DIR               -d --dir --directory    The directory from which to read config files
 * default:     NODE_CONF_DEFAULT           -s --default            The filename prefix for the default config
 * override:    NODE_CONF_OVERRIDE          -o --override           The filename prefix for the override config
 * tier:        NODE_CONF_TIER, NODE_ENV    -t --tier               The tier for which to load the config
 * cwd:         NODE_CWD                    -c --cwd                The root directory used to determine relative path
 * noenv:       NODE_IGNORE_ENV             -n --noenv              Ignore environment variable overrides
 * envmapsep:   NODE_ENV_MAP_SEPARATOR      -m --mapseparator       Separator for mapping env var overrides to configs
 * locations
 *
 * @fires Config#Config:change
 */
class Config extends EventEmitter {
  constructor () {
    super();
    this._sources = [];
    this._load(this.tier);
    this._parseEnv();
  }
  
  /**
   * Loads the configurations from the file system and makes them available on the object.
   * @param {string} tier
   * @fires Config#Config:change
   * @private
   */
  _load (tier) {
    try {
      let files = fs.readdirSync(this.dir);
      let defaultConfig = {};
      let tierConfig = {};
      let overrideConfig = {};
      for (let file of files) {
        let fullPath = path.join(this.dir, file);
        if (file.startsWith(this.default)) {
          defaultConfig = this._readFile(fullPath);
          this._tier = this._tier || path.parse(file).name;
        } else if (file.startsWith(this.override)) {
          overrideConfig = this._readFile(fullPath);
        } else if (file.startsWith(tier)) {
          tierConfig = this._readFile(fullPath);
          this._tier = path.parse(file).name;
        } else {
          continue;
        }
        // TODO sometimes sources are added twice (not necessarily at this code location)
        this._sources.push(fullPath);
      }
      this._apply(overrideConfig);
      this._apply(tierConfig);
      this._apply(defaultConfig);
      this.emit('change', this);
    } catch (e) {
      this._tier = tier;
    }
    this.prodNames = this.prodNames || ['production', 'prod', 'pro', 'p'];
  }
  
  /**
   * Reads a file and return the content as json object. Supports .js, JSON and YAML.
   * @param {String} fullPath
   * @returns {object}
   * @private
   */
  _readFile (fullPath) {
    let ext = path.extname(fullPath);
    switch (ext) {
      case '.js':
      case '.json':
        return require(fullPath);
      case '.yml':
      case '.yaml':
        return yaml.parse(fs.readFileSync(fullPath, 'utf8'));
      default:
        throw new Error('Unknown config file format');
    }
  }
  
  /**
   * Applies all configuration in the given object to this instance of Config, so that they can be used directly via
   * properties (e.g. config.myprop).
   * @param {object} config
   * @private
   */
  _apply (config) {
    for (let prop in config) {
      if (this[prop] === undefined) {
        this[prop] = config[prop];
      } else {
        defaultsDeep(this[prop], config[prop]);
      }
    }
  }
  
  /**
   * Looks through all environment variables and applies them to the current configuration, overriding any existing
   * values.
   * @private
   */
  _parseEnv () {
    if (args.n == true || args.noenv == true || process.env.NODE_IGNORE_ENV == true) {
      return;
    }
    let delimiter = args.mapseparator || args.M || process.env.NODE_ENV_MAP_SEPARATOR || '_';
    let sanitized = {}
    for (let prop in process.env) {
      sanitized[prop.toLowerCase()] = process.env[prop];
    }
    let overrides = unflatten(sanitized, {delimiter});
    delete overrides['0'];
    this._applyEnv(this, overrides);
  }
  
  /**
   * Recursively applies one object to another while ignoring target key case (upper/lower).
   * @param {object} target The target object to which to apply the source values
   * @param {object} source The source object from which to apply values to the target
   * @private
   */
  _applyEnv(target, source) {
    for (let prop in target) {
      if (source[prop.toLowerCase()]) {
        if (typeof target[prop] == 'object') {
          this._applyEnv(target[prop], source[prop.toLowerCase()]);
        } else {
          try {
            target[prop] = JSON.parse(source[prop.toLowerCase()]);
          } catch {
            target[prop] = source[prop.toLowerCase()];
          }
        }
        delete source[prop.toLowerCase()]
      }
    }
    Object.assign(target, source);
  }
  
  /**
   * @returns {string} the currently set tier
   */
  get tier () {
    if (this._tier) {
      return this._tier;
    }
    this.tier = args.t || args.tier || process.env.NODE_CONF_TIER || process.env.NODE_ENV || 'development';
    return this._tier;
  }
  
  /**
   * Set the tier and automatically reloads the configuration
   * @param {string} tier
   */
  set tier (tier) {
    this._load(tier);
  }
  
  /**
   * @returns {string} The directory in which all configurations are stored.
   */
  get dir () {
    if (this._dir) {
      return this._dir;
    }
    this._dir = args.directory || args.dir || args.d || process.env.NODE_CONF_DIR || path.join(cwd, 'config');
    return this._dir;
  }
  
  /**
   * Returns the name/prefix used for the override file.
   * @returns {string}
   */
  get override () {
    if (this._override) {
      return this._override;
    }
    this._override = args.override || args.o || process.env.NODE_CONF_OVERRIDE || false;
    return this._override;
  }
  
  /**
   * Returns the name/prefix for the default file.
   * @returns {*}
   */
  get default () {
    if (this._default) {
      return this._default;
    }
    this._default = args.s || args.default || process.env.NODE_CONF_DEFAULT || 'default.';
    return this._default;
  }
  
  /**
   * Returns wether the current config is for production tier or not.
   * @returns {boolean}
   */
  get isProd () {
    return this.prodNames.indexOf(this.tier) !== -1;
  }
  
  /**
   * Will reload the configuration system
   * @param {string} [tier]       The new tier the config should be loaded for
   * @param {string} [dir]        The directory from which the config should be loaded
   * @param {string} [override]   An additional configuration that will override tier and default config if set.
   */
  reload (tier = this.tier, dir = this._dir, override) {
    for (let prop in this) {
      if (prop[0] !== '_' && this.hasOwnProperty(prop)) {
        delete this[prop];
      }
    }
    this._dir = path.isAbsolute(dir) ? dir : path.join(cwd, dir);
    this._override = override;
    this._sources = [];
    delete this._tier;
    this.tier = tier;
    this._parseEnv();
    return this;
  }
  
  /**
   * Allows to add a default configuration, that sets any values that haven't been set yet.
   * @param {Object|string} config    Either the filename/directory to a configuration or the configuration itself
   * @param {string} pathComponents   Additional path components if the first argument is a string (avoids you
   *                                  having to join them manually)
   */
  addDefaultConfig (config, ...pathComponents) {
    if (typeof config === 'string') {
      if (arguments.length > 1) {
        config = path.join(config, ...pathComponents);
      }
      let dir = path.isAbsolute(config) ? config : path.join(cwd, config);
      let stat = fs.statSync(dir);
      if (stat.isDirectory()) {
        let files = fs.readdirSync(dir);
        for (let file of files) {
          let ext = path.extname(file);
          if (['.js', '.json', '.yml', '.yaml'].includes(ext)) {
            let fullPath = path.join(dir, file);
            let name = path.basename(file, ext);
            let result = name.split('.').reduceRight((prev, curr) => ({[curr]: prev}), this._readFile(fullPath));
            this._apply(result);
            this._sources.push(fullPath);
          }
        }
      } else if (stat.isFile()) {
        let ext = path.extname(config);
        let name = path.basename(config, ext);
        let result = name.split('.').reduceRight((prev, curr) => ({[curr]: prev}), this._readFile(dir));
        this._apply(result);
        this._sources.push(dir);
      } else {
        console.log('The given path is invalid:', config);
      }
    } else {
      this._apply(config);
    }
    this.emit('change', this);
    return this;
  }
  
  /**
   * Will normalize a given path and return an array with all paths being absolute.
   * @param {string} cwd          The current working directory that all relative paths should originate from
   * @param {string|string[]} dir The directories to parse into an absolute path
   * @returns {string[]}  An array with absolute paths
   */
  normalizePath (cwd, ...dir) {
    let dirs = [];
    for (let entry of dir) {
      Array.isArray(entry) ? dirs.push(...entry) : dirs.push(entry);
    }
    for (let i in dirs) {
      let entry = dirs[i];
      dirs[i] = path.isAbsolute(entry) ? entry : path.join(cwd, entry);
    }
    return dirs;
  }
}

module.exports = new Config();
