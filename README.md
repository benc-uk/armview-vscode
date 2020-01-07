# ARM Viewer for VS Code

[![Version](https://vsmarketplacebadge.apphb.com/version/bencoleman.armview.svg)](https://marketplace.visualstudio.com/items?itemName=bencoleman.armview)
![Installs](https://vsmarketplacebadge.apphb.com/installs-short/bencoleman.armview.svg)

This extension displays a graphical preview of Azure Resource Manager (ARM) templates. The view will show all resources with the official Azure icons and also linkage between the resources. Uses the [Cytoscape.js library](http://js.cytoscape.org/)

You can drag and move icons as you wish, zoom in and out with the mouse wheel and drag the canvas to pan around. Clicking on a resource will show a small "infobox" with extra details. See [usage](#Usage) for more details and features.

Extension as been tested successfully against all 900+ [Azure Quickstart Templates](https://github.com/Azure/azure-quickstart-templates) 😁

![s1](assets/readme/screen1.png)

![s2](assets/readme/screen2.png)

![s3](assets/readme/screen3.png)

## Usage

- Open a ARM template JSON file, and ensure it is active/focused
  - Click the eye symbol in the top right of the editor tab bar
  - ![toolbar](assets/readme/icon.png)
- Or:
  - Open the VS Code command pallet with `Ctrl+Shift+P` or `⇧⌘P` on a mac
  - Start typing `ARM Viewer`
  - Pick `ARM Viewer: Preview ARM file graphically` from the list
- Or:
  - Use keyboard shortcut `Ctrl+Alt+Q`

## Installation from source

1. Run `vsce package` to create a package
2. Run `code --install-extension armview-0.3.4.vsix`

Read more over [here](https://code.visualstudio.com/docs/editor/extension-gallery#_install-from-a-vsix).

## Basic Features

- Click on a resource to show popup 'infobox' for that resource, a selected subset of details will be shown.
- Click and drag on background to move and pan the view around.
- Zoom in and out with the mouse wheel.
- Drag icons around to layout as your wish, one tip is to click 'Re-fit' after moving to get the best view & zoom level.

## Toolbar

- Click the 'Labels' button to toggle labels from resource names to resource types.
- Click the 'Re-fit' button to refit the view to the best zoom level.
- Click the 'Snap' button to toggle snap to grid mode on/off.
- Click the 'Export' button to export as PNG, you will be prompted for a filename. The PNG will have a transparent background.
- Two auto layout modes are available:
  - 'Tree' lays out the nodes in a hierarchical manner, ok for small templates, also the default.
  - 'Grid' puts the nodes on a grid, better for large templates but will often not make logical sense.

## Parameter Files

By default the extension will try to use any `defaultValues` found in the parameters section of the template.

To apply a set of input parameters and overrides to the view, click 'Params' toolbar button. You will be prompted for a ARM parameters JSON file (e.g. `azuredeploy.parameters.json`). The values in the parameters JSON fill will be used in place of values set in the template.

## Resource Filters

The view can sometimes get very crowded, especially when you have many resources of the same time (e.g. NSG rules or Key Vault secrets). Click the 'Filter' toolbar button to apply a filter to the view. You will be prompted for a input string:

- This is a comma separated list of resource types you want *removed from the view*.
- A partial substring of the type can be used, e.g. `secrets` or `vaults/secrets` or `microsoft.keyvault/vaults/secrets`.
- Case does not matter.
- Entering an empty string will remove the filter.

## Linked Templates

The extension will attempt to locate and display linked templates, these resources will be shown grouped together in a shaded box. Linked template support comes with many limitations. This is an outline of how it works:

- If the resolved linked template URL is externally accessible, it will be downloaded and used. Results are cached to stop excessive HTTP calls.
- If the URL is not accessible, then an attempt is made to load the file locally based on a guess from the filename and parent dir extracted from the URL, e.g. `nested/linked.json`.
- If that fails, then the local filesystem of the VS Code workspace will be searched for the file. Some assumptions are made in this search:
  - The search will only happen if the linked file has a *different* filename from the main/master template being viewed. Otherwise the search would just find the main template being viewed.
  - The linked template file should located somewhere under the path of the main template, sub-folders will be searched. If the file resides elsewhere outside this path it will not be located.
  - The first matching file will be used.
- If linked template URL or filename is dynamic based on template parameters it is very likely not to resolve, and will not be found.
- If the linked template can not be located/loaded then a icon representing the deployment will be shown as a fallback.
- Currently there is no cache for data fetched from external URLs.
- The layout of the icons/resources can initially be a bit strange, and will require some manual tidy up to look good. I'm investigating how to improve this.

## Notes

This is a port of a older *ARM Viewer* project, which was a [standalone Node.js webapp](https://github.com/benc-uk/azure-armviewer).

This project was created as a learning exercise, but was heavily inspired & influenced by the old ARMViz tool. ARMViz sadly seems to have been abandoned, it often has problems displaying some templates. Personally I wasn't a fan of look of the output, and found it hard to read. These are a few of the reasons why I created this project

## ARM Template JSON Support

ARM templates go outside the JSON specification and break it in a couple of areas:

- Support for comments in the JSON file (aka JSONC)
- Allowing the use of multi-line strings
The extension supports both of these as far as is reasonably possible, multi-line strings in particular has no known spec on how it should be supported. The extension is also aware of the language server provided by the 'Azure Resource Manager Tools' extension and will accept files set to 'arm-template' as the language type.

## Limitations & Known Issues

- The code attempts to find the links (`dependsOn` relationships) between ARM resources, however due to the *many* subtle and complex ways these relationships can be defined & expressed, certain links may not be picked up & displayed.
- Icons for the most commonly used & popular resource types have been added, however not every resource is covered (There's simply too many and no canonical source). The default ARM cube icon will be shown as a fallback. Get in touch if you want a icon added for a particular resource type.
- Resolving names & other properties for resources is attempted, but due to programmatic way these are generally defined with ARM functions and expressions, full name resolution is not always possible.
- Templates using the loop functions `copy` & `copyIndex` to create multiple resources will not be rendered correctly due to limitations on evaluating the dynamic iterative state of the template.
