# appbuilder-convert

> A utility for converting a [Telerik AppBuilder CLI](http://www.telerik.com/appbuilder/command-line-interface) project to an [Apache Cordova](https://cordova.apache.org/) project.
> Alternatively you can simply use this as a method for building your AppBuilder projects locally.

**Currently only supports Android and iOS platforms**

## Installation
```shell
npm install -g appbuilder-convert
```

## Usage
```shell
appbuilder-convert --source MyAppBuilderProject/ --dest MyCordovaProject/
```

## Disclaimer
The AppBuilder online build process may do some things behind the scenes that I've missed, so use with care and please let me know of any issues.

## Release History
- 0.1.5 Added check for static plugin directory
- 0.1.3 Fixed issue with incorrectly mapped iOS resources
- 0.1.2 Persist plugin variables to cordova config.xml
- 0.1.0 Initial Implementation
