var config = require('..');
var expect = require('chai').expect;
var path = require('path');

describe('tiers', () => {
    it('should set the tier to development by default', () => {
        config.reload();
        expect(config.tier).to.equal('development');
        expect(config.dir).to.equal(path.join(path.dirname(require.main.filename), 'config'));
    });

    it('should reload the configuration from a new directory', () => {
        config.reload('prod', 'testconfig');
        expect(config.tier).to.equal('prod');
        expect(config.dir).to.equal(path.join(path.dirname(require.main.filename), 'testconfig'));
    });

    it('should load the default configuration', () => {
        config.reload('none', path.join(__dirname, 'data'));
        expect(config.tier).to.equal('default');
        expect(config.prop).to.equal(1);
        expect(config.devprop).to.be.not.ok;
        expect(config.stagingprop).to.be.not.ok;
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
});
