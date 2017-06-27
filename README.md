# Cheevr-Config
[![npm version](https://badge.fury.io/js/%40cheevr%2Fconfig.svg)](https://badge.fury.io/js/%40cheevr%2Fconfig)
[![Build Status](https://travis-ci.org/Cheevr/Config.svg?branch=master)](https://travis-ci.org/Cheevr/Config)
[![Coverage Status](https://coveralls.io/repos/Cheevr/Config/badge.svg?branch=master&service=github)](https://coveralls.io/github/Cheevr/Config?branch=master)
[![Dependency Status](https://david-dm.org/Cheevr/Config.svg)](https://david-dm.org/Cheevr/Config)



# About

This is a tool designed to load configurations from the file system. It is easily extensible
to use in your own projects or libraries and can work across multiple dependencies. While
the implementation favors convention over configuration, there are options to customize
where and how configurations are loaded.
The configuration system is tier aware so that multiple configuration can be loaded depending
on the tier you're running your software (see examples).


## Simple Usage

To begin go to your project root and create a file called ```config/default.json``` that might
look like this (Note that any level of nesting and data types are supported):

```JSON
{
    "port":80
}
```

Now to access this configuration all you have to do is require the module and all values will be
available on the required object. Create an ```index.js``` like this:

```JavaScript
const config = require('@cheevr/config');

console.log(config.port);
```

If you run your program it will print ```80```. Now create a second file called
```config/development.js``` and add this content:

```JavaScript
module.exports = {
    port: 8080
}
```

If you run your program it will still print the previous response, if however you launch with
```node -t development .``` it will now print ```8080``` since the tier has configured the
library to load the development configuration. Note that in this example we've used a **.js**
file instead of **.json** file. Either one is interchangeably supported.


# Installation

Using npm the default installation method is easy enough

```FileSystem
npm i @cheevr/config
```


# API

There are multiple features available that can make life easier as a developer:


## Tier Ordering

This module assumes that you're trying to load different configurations for different environments
or tiers. The configuration you load is done in 3 phases:

1. Load default configuration
2. Load tier configuration and overwrite default config
3. (optional) Load overwrite configuration config

The optional overwrite configuration can be used to overwrite a tier configuration for use e.g.
in a local environment so that you don't have to go and change config files every time you need
to test a tier configuration against local services.


## Tier Selection

There are multiple ways on how to select tiers. For each method the library will do a prefix
check against the filename of the configuration. If for example you have a configuration file
named **production**, any config flag that prefix matches that name will load that configuration.
Some identifiers that will work in the example could be **p**, **pro**, **prod** or
**production**. If you don't select any tier the library will default to **development**.

### Command Line

The library is looking for 2 parameters passed to a program using this configuration method:

* ```-t```: Specifies the tier to load during phase 2 of the loading process
* ```-o```: Specifies the name of the overwrite config file loaded during phase 3

### Environment Variables

The library can also be configured to use tiers by using environment variables. These are only
used if no command line parameters have been passed in to overwrite them (where applicable):

* ```NODE_CONF_TIER```: Uses the given config name to look for a configuration
* ```NODE_ENV```: Used as a fallback if **NODE_CONF_TIER** has not been set.
* ```NODE_CONF_DEFAULT```: Used to specify the name of the default file (defaults to **default**)
* ```NODE_CONF_OVERRIDE```: Used in place of the override file
* ```NODE_CONF_DIR```: The directory from which to load (defaults to **config/**)
* ```NODE_CWD```: Specifies the root directory in which we expect to find **NODE_CONF_DIR** (defaults to cwd)

### Programmatically

Finally you can load configurations programmatically note that this will cause a reload after the
default configuration has been loaded so make sure that you do this before you start using the
config object.

```JavaScript
const config = require('@cheevr/config');

config.reload('prod', '/etc/myservice', 'override');
```

This will reload the configuration from the folder **/etc/myservice** for the prod tier
while applying the override configuration in that same folder. For more examples take a look
at the test cases or the Interaction API.


## Interaction API

Once the configuration has been loaded, it's going to be available on the required object.
In addition there's a few helper methods that you can access on the same object. Note that if
you specify any configuration properties that have the same name as one of these
properties/methods, they will overwrite that functionality and instead be your configured value.


### Config.tier({string} [tier])

This will return the current set tier if no parameter if given and allows you to set the tier to
any value you want. Note that this will trigger a reload of the configuration.

### Config.dir()

Readonly property that will return the directory that we're trying to load configurations from.

### Config.override()

Readonly property that will return the name of the override file.

### Config.default()

Readonly property that will return the name of the default file.

### Config.isProd()

Readonly property that will return true if the configurtion has loaded a file called either
**production**, **prod**, **pro** or **p**.

### Config.reload({string} [tier], {string} [dir], {string} [override])

This method will allow you to reload the configuration programmatically while specifying the
tier name, root directory and override file name. All parameters are optional, but a reload
will be triggered no matter what.

### Config.addDefaultConfig({string|object} config, {string} ...path)

If you're writing a module that will be included in other projects you will face the problem
that your configuration will not be loaded since the root directory will be where the
requiring project is located. This method will allow you to add configuration for your module
independent of the root directory and add these setting as default settings. Any settings
found in the actual root project will still be able to overwrite them if they are set.

The method accepts either a filename or the actual configuration as first parameter. Any further
parameters passed into the method will be concatenated via ```path.join``` and used as the
folder in which to look for configurations. A common way to specify your module configuration
would look like this:

```JavaScript
const config = require('@cheevr/config').addDefaultConfig('module', __dirname, 'config')
```

Note that files you include will use the filename as a category under which all properties are
nested, so a file named **backend.js** would result in it's configuration being available under
```config.backend```. There is no way to define root properties in a module like this other than
to assign a single value in a file which would be assigned to a property matching the file name.

This method will additionally support splitting up of configuration files by allowing nested
file names. Using the previous example, we could specify a configuration for
```config.backend.server``` by simply defining a file called **backend.server.js** that will
assign all content to the nested property.

### Config.normalizePath(cwd, ...dir)

Will normalize one or more paths but making them absolute in relation to the given cwd. This method
is more of a helper, but some external modules will want to make use of it.


## Events

The config will emit an event whenever a configuration is loaded through one of it's methods.

### change

You can react to changes when configuration is being reloaded by registering an event listener:

```JavaScript
config.on('change', config => {});
```

Note that this event is only triggered when one of the methods on the config object is used and not
when an arbitrary property is changed.


## Examples

For more examples check out the test directory.


## Future Features for Consideration

* Support for splitting up config files not just module configurations
* YAML support
* CWD command line option for all the environment variable settings (if possible)
* Setters for ```dir```, ```override``` and ```default```
* Wrap with a Proxy so that setting properties can fire an event on change
