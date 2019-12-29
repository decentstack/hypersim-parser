# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.3] - 2019-12-26
### Changed
- Parser constructor now takes options: { isObjectStream: Boolean, process: function(data) }

### Added
- Browser support by alternatively accepting Uint8Arrays and chunks of strings besides the node Buffer support.

## [0.0.4] - 2019-12-26
### Changed
- fixed bug when using object streams as input.
- constructor opt for object streams renamed to new Parser({ binary: false })

### Added
- persistance cache as 4th argument to reducer.
