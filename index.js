const args = require('minimist')(process.argv.slice(2));
const defaultsDeep = require('lodash/defaultsDeep');
const EventEmitter = require('events').EventEmitter;
const fs = require('fs');
const path = require('path');


/**
 * The root directory of the code that is being run right now.
 */
const cwd = process.env.NODE_CWD || process.cwd();

/**
 * Configurations will be loaded based on the prefix given through the tier, meaning that tier d would resolve to
 * the file that starts with d (excluding the default and override files).
 * Default files can be specified using command line arguments, environment variables, or using the reload functionality:
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
 *
 * @fires {Config} change
 */
class Config extends EventEmitter {
    constructor() {
        super();
        this._sources = [];
        this._load(this.tier);
    }

    /**
     * Loads the configurations from the file system and makes them available on the object.
     * @param {string} tier
     * @private
     */
    _load(tier) {
        try {
            let files = fs.readdirSync(this.dir);
            let defaultConfig = {};
            let tierConfig = {};
            let overrideConfig = {};
            for (let file of files) {
                let fullPath = path.join(this.dir, file);
                if (file.startsWith(this.default)) {
                    defaultConfig = require(fullPath);
                    this._tier = this._tier || path.parse(file).name;
                } else if (file.startsWith(this.override)) {
                    overrideConfig = require(fullPath);
                } else if (file.startsWith(tier)) {
                    tierConfig = require(fullPath);
                    this._tier = path.parse(file).name;
                } else {
                    continue;
                }
                // TODO sometimes sources are added twice (not necessarily at this code location)
                this._sources.push(fullPath)
            }
            this._apply(overrideConfig);
            this._apply(tierConfig);
            this._apply(defaultConfig);
            this.emit('change', this);
        } catch(e) {
            this._tier = tier;
        }
        this.prodNames = this.prodNames || ['production', 'prod', 'p'];
    }

    _apply(config) {
        for (let prop in config) {
            if (this[prop] === undefined) {
                this[prop] = config[prop];
            } else {
                defaultsDeep(this[prop], config[prop]);
            }
        }
    }

    /**
     * @returns {string} the currently set tier
     */
    get tier() {
        if (this._tier) {
            return this._tier;
        }
        let tier = process.env.NODE_CONF_TIER || process.env.NODE_ENV || 'development';
        tier = args.t || args.tier || tier;
        this.tier = tier;
        return this._tier;
    }

    /**
     * Set the tier and automatically reloads the configuration
     * @param {string} tier
     */
    set tier(tier) {
        this._load(tier);
    }

    /**
     * @returns {string} The directory in which all configurations are stored.
     */
    get dir() {
        if (this._dir) {
            return this._dir;
        }
        this._dir = process.env.NODE_CONF_DIR || path.join(cwd, 'config');
        this._dir = args.directory || args.dir || args.d || this._dir;
        return this._dir;
    }

    /**
     * Returns the name/prefix used for the override file.
     * @returns {string}
     */
    get override() {
        if (this._override) {
            return this._override;
        }
        this._override = process.env.NODE_CONF_OVERRIDE || false;
        this._override = args.override || args.o || this._override;
        return this._override;
    }

    /**
     * Returns the name/prefix for the default file.
     * @returns {*}
     */
    get default() {
        if (this._default) {
            return this._default;
        }
        this._default = process.env.NODE_CONF_DEFAULT || 'default.';
        this._default = args.s || args.default || this._default;
        return this._default;
    }

    /**
     * Returns wether the current config is for production tier or not.
     * @returns {boolean}
     */
    get isProd() {
        return this.prodNames.indexOf(this.tier) !== -1
    }

    /**
     * Will reload the configuration system
     * @param {string} [tier]       The new tier the config should be loaded for
     * @param {string} [dir]        The directory from which the config should be loaded
     * @param {string} [override]   An additional configuration that will override tier and default config if set.
     */
    reload(tier = this.tier, dir = this._dir, override) {
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
        return this;
    }

    /**
     * Allows to add a default configuration, that sets any values that haven't been set yet.
     * @param {Object|string} config    Either the filename/directory to a configuration or the configuration itself
     * @param {string} pathComponents   Additional path components if the first argument is a string (avoids you
     *                                  having to join them manually)
     */
    addDefaultConfig(config, ...pathComponents) {
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
                    if (ext === '.js' || ext === '.json') {
                        let fullPath = path.join(dir, file);
                        let name = path.basename(file, ext);
                        let result = name.split('.').reduceRight((prev, curr) => ({[curr]: prev}), require(fullPath));
                        this._apply(result);
                        this._sources.push(fullPath);
                    }
                }
            } else if (stat.isFile()) {
                let ext = path.extname(config);
                let name = path.basename(config, ext);
                let result = name.split('.').reduceRight((prev, curr) => ({[curr]: prev}), require(dir));
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
     * Will normalize a given path a return an array with all paths being absolute.
     * @param {string} cwd          The current working directory that all relative paths should originate from
     * @param {string|string[]} dir The directories to parse into an absolute path
     * @returns {string[]}  An array with absolute paths
     */
    normalizePath(cwd, ...dir) {
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
