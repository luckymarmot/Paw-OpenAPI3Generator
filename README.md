# OpenAPI 3.0 Generator for Paw

A [Paw Extension](https://paw.cloud/extensions) to export OpenAPI files from Paw.

## How to use?

1. In Paw, go to File menu, then Export -> All Requests -> OpenAPI 3.0 Generator
2. Save to a file (probably *.json format, but it might be changed to *.yaml)
3. Import file in Swagger (You can check file e.g. at [here](https://editor.swagger.io))

#Development notes
1. To create "realtime" development environment feel, You can use `npm run watch` command and in Paw choose "OpenAPI 3.0 Generator" as a preview mode. Extension will be refreshed (built + copied to Paw) each time any *.ts file in "src/\*\*/\*.ts" has been changed.
2. In Paw -> "Window" -> "Extension console" is the console where You have access to debugging console
3. To use `console.log` and `console.error` function it is recommended to use `Console` class from `src/lib`. Standard console.log outputs object as `[object Object]` while `Console.log` will  output stringified version of object
4. Cookies cannot be exported, because "Session" is no available in Generator Extensions (for now)
5. AuthConverter allows 1 authorization at a time -> this converter needs to be changed, if multiple authorization per request is allowed

## License

This Paw Extension is released under the MIT License. Feel free to fork, and modify!

Copyright © 2014-2020 [Paw](https://paw.cloud)
