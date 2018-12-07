/* global describe, it, afterEach, beforeEach, after, before */
const config = require('..');
const expect = require('chai').expect;
const path = require('path');

describe('tiers', () => {
    it('should set the tier to development by default', () => {
        config.reload();
        expect(config.tier).to.equal('development');
        expect(config.dir).to.equal(path.join(process.cwd(), 'config'));
    });

    it('should reload the configuration from a new directory', () => {
        config.reload('prod', 'testconfig');
        expect(config.tier).to.equal('prod');
        expect(config.dir).to.equal(path.join(process.cwd(), 'testconfig'));
    });

    it('should load the default configuration', () => {
        config.reload('none', path.join(__dirname, 'data'));
        expect(config.tier).to.equal('default');
        expect(config.prop).to.equal(1);
        expect(config.devprop).to.be.not.ok;
        expect(config.stagingprop).to.be.not.ok;
    });

    it('should include all source files when loading configurations', () => {
        config.reload('prod', path.join(__dirname, 'data'));
        expect(config._sources).to.include(path.join(__dirname, '/data/default.json'));
        expect(config._sources).to.include(path.join(__dirname, '/data/prod.json'));
    });

    it('should load the development config', () => {
        config.reload('d', path.join(__dirname, 'data'));
        expect(config.tier).to.equal('development');
        expect(config.prop).to.equal(2);
        expect(config.devprop).to.be.ok;
        expect(config.stagingprop).to.be.not.ok;
    });

    it('should load the staging config', () => {
        config.reload('s', path.join(__dirname, 'data'));
        expect(config.tier).to.equal('staging');
        expect(config.prop).to.equal(3);
        expect(config.devprop).to.be.not.ok;
        expect(config.stagingprop).to.be.ok;
    });

    it('should override the default config', () => {
        config.reload('none', path.join(__dirname, 'data'), 'local');
        expect(config.tier).to.equal('default');
        expect(config.override).to.be.ok;
        expect(config.prop).to.equal(4);
        expect(config.devprop).to.be.not.ok;
        expect(config.stagingprop).to.be.not.ok;
    });

    it('should override a tier config', () => {
        config.reload('d', path.join(__dirname, 'data'), 'l');
        expect(config.tier).to.equal('development');
        expect(config.prop).to.equal(4);
        expect(config.devprop).to.be.ok;
        expect(config.stagingprop).to.be.not.ok;
    });

    it('should know that this is not production env', () => {
        config.reload('d', path.join(__dirname, 'data'));
        expect(config.tier).to.equal('development');
        expect(config.isProd).to.be.false;
    });

    it('should know that this is production env', () => {
        config.reload('p', path.join(__dirname, 'data'));
        expect(config.tier).to.equal('prod');
        expect(config.isProd).to.be.true;
    });

    it('should allow to add a default config', () => {
        config.reload();
        config.addDefaultConfig({
            moduleConfig: 'test'
        });
        expect(config.moduleConfig).to.equal('test');
    });

    it('should use the default config even if there is no config directory', () => {
        config.reload('d', path.join(__dirname, '/nowhere'));
        config.addDefaultConfig(path.join(__dirname, 'data2/section.js'));
        expect(config.section.subtype).to.equal('subsection');
        expect(config._sources).to.include(path.join(__dirname, '/data2/section.js'));
    });

    it('should reset the configuration if it reloads the same file twice', () => {
        config.reload('d', path.join(__dirname, '/nowhere'));
        config.addDefaultConfig(path.join(__dirname, 'data2/section.js'));
        expect(config.section.subtype).to.equal('subsection');
        config.reload('d', path.join(__dirname, '/nowhere'));
        expect(config.section).to.be.undefined;
    });

    it('should allow to add another default file for a subsection', () => {
        config.reload('d', path.join(__dirname, 'data'));
        config.addDefaultConfig(path.join(__dirname, 'data2/section.js'));
        expect(config.section.subtype).to.equal('subsection');
    });

    it('should allow nested subsections fort default files', () => {
        config.reload('d', path.join(__dirname, 'data'));
        config.addDefaultConfig(path.join(__dirname, 'data2/section.subsection.js'));
        expect(config.section.subsection.subSubSection).to.be.true;
    });

    it('should allow to add another default directory for a subsection', () => {
        config.reload();
        config.addDefaultConfig(path.join(__dirname, 'data2'));
        expect(config.section.subtype).to.equal('subsection');
        expect(config.section.subsection.subSubSection).to.be.true;
    });

    it('should allow to add another default directory split up in parts', () => {
        config.reload();
        config.addDefaultConfig(__dirname, 'data2');
        expect(config.section.subtype).to.equal('subsection');
    });

    it('should support deep copied configuration', () => {
        config.reload('s');
        config.addDefaultConfig(path.join(__dirname, 'data2'));
        expect(config.section.nested.val).to.equal('staging');
    });

    it('should normalize a path', () => {
        let paths = config.normalizePath('/some/home/dir', 'a/relative/path');
        expect(paths).to.deep.equal(['/some/home/dir/a/relative/path']);
    });

    it('should normalize multiple paths', () => {
        let paths = config.normalizePath('/some/home/dir', [ 'a/relative/path' ], '/an/absolute/path');
        expect(paths).to.deep.equal(['/some/home/dir/a/relative/path', '/an/absolute/path']);
    });

    it('should emit an event when the configuration has changed', done => {
        config.reload();
        config.once('change', config => {
            expect(config.section.subtype).to.equal('subsection');
            expect(config.section.subsection.subSubSection).to.be.true;
            done();
        });
        config.addDefaultConfig(path.join(__dirname, 'data2'));
    });
    
    it('should support Yaml files as a source', () => {
      config.reload('qa', path.join(__dirname, 'data'));
      expect(config._sources).to.include(path.join(__dirname, '/data/qa.yaml'));
      expect(config.prop1.prop2).to.equal('test5');
    });
  
    it('should support Yml files as a source', () => {
      config.reload('test', path.join(__dirname, 'data'));
      expect(config._sources).to.include(path.join(__dirname, '/data/test.yml'));
      expect(config.yamlString).to.equal('blah');
      expect(config.yamlNumber).to.equal(1);
      expect(config.yamlFloat).to.equal(2.1);
      expect(config.yamlBool).to.equal(true);
      expect(config.yamlJSON).to.deep.equal({jsonProp:'jsonVal'})
    });
    
    it('should override configurations with environment values', () => {
      config.reload('t', path.join(__dirname, 'data'));
      expect(config.home.java).to.not.equal('/dev/null');
    });
});
