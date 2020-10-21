## 0.4.5
- Improved handling of dependsOn links with nested resources (e.g. SQL databases).
- New icons for management groups and subscriptions.
- ARM template function added `take()`.
- NPM package updates.
- Cytoscape updated to 3.16.2


## 0.4.4
- No features / changes
- Seriously none
- Testing new release process with GitHub Actions


## 0.4.3
- Changes behaviour of cancelling the filter dialog (will not wipe your setting when hitting esc)
- Telemetry fixes
- (internal) Linting setup improvements


## 0.4.2
- Disabling telemetry sent when icon is missing, probably a bug in external `vscode-extension-telemetry` package. Will fix `updatedStack.replace` error


## 0.4.1
- Package updates for security fixes etc
- Switched JSON parser to https://github.com/microsoft/node-jsonc-parser
- No new features

## 0.4.0
- NEW ICONS! ✨🎨 Refreshed the icons to the new style Azure icons.  
  Not every icon has a new look as this style refresh hasn't rolled out to every icon I use.
- Switched to new JSON linting library. Fixes obscure bug where `\\v` would render as ``
- Code base now linted with typescript-eslint, and linting is checked on PRs

  
## 0.3.4
- Responsive toolbar on narrow view
- Better fetching of external linked templates


## 0.3.3
- Removed workaround for webview resources, root cause was fixed in VS Code v1.39.2


## 0.3.2
- Temporary workaround while for webview resources are broken in a remote VS Code session. Awaiting fix from VS Code teams
- Caching of external URLs for linked templates, large performance boost.


## 0.3.1
- Export as PNG
- Theme support (not fully implemented, only one theme currently 'original')
- VS Code theme colouring on links between nodes and box around linked deployments
- Fixes to expression evaluation (uri, replace) and guid() function added
- Yet more fixes on linked templates
- Large scale internal refactoring for better code structure & TypeScript


## 0.3.0
- Bug fixes, the usual; variable resolution and linked templates
- Much improved handling of multi-level linked templates (links within links)
- New layout modes; tree and grid
- Animation removed in most situations, it was annoying
- Support for multi-line strings (I think!)


## 0.2.1
- Bug fixes


## 0.2.0
- Support for loading a parameters file and applying values to the output
- Filter out resources by type, helps de-clutter the view on very busy templates, or when you have many similar resources you want to hide (e.g. NSG rules)
- New look toolbar
- Status bar
- Several more fixes & improvements for linked templates and variable resolution
- Loading progressing indicator
- Reload button
- Many new icons; automation, SQL Server, blobservices, and more
- A bunch more bugs I expect ;)


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
