## 0.2.0
- Support for loading a parameters file and applying values to the output
- Several more fixes & improvements for linked templates, and variable resolution
- Loading progressing indicator
- Reload button
- Many new sub-resource icons; automation, SQL Server, blobservices, and more

## 0.1.1
- Several fixes & improvements to how linked templates are handled and searched for
  
## 0.1.0
- Support for linked & nested templates! See readme for limitations
- Support for the new vscode-azurearmtools extension language server and 'ARM Template' language type
- displayName tag if present will be used in place of the resource name

## 0.0.9
- Many fixes to parameter & variable resolution
- Improved error messages and logging
- Tested successfully against ALL templates on https://github.com/Azure/azure-quickstart-templates

## 0.0.8
- Parameter & variable values which are objects now resolved
- Parameters defaultValues detected picked up and used
- Display unresolvable properties in italics and inside {}

## 0.0.7
- Many, many new icons added!
- Support for JSON comments, which is allowed by ARM
- Custom default icon for API Management sub-resources

## 0.0.6
- Fix for SKU evaluation error (exp.trim)
- Nicer error messages
  
## 0.0.5
- Snap to grid added
- Telemetry tracking added
- Fix for handling resource tags
- Added resource SKU details to info box
- Smarter handling of updates when user is editing JSON

## 0.0.4
- Fixed initialization & first display problems
- Added preview icon to top right of editor menu bar
- More robust activation options/filters
- Extension is now a singleton panel

## 0.0.3
- Super minor readme fixes, added this changelog

## 0.0.2
- Initial release. We don't talk about v0.0.1
