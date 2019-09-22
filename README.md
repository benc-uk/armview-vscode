# ARM Viewer for VS Code
[![Version](https://vsmarketplacebadge.apphb.com/version/bencoleman.armview.svg)](https://marketplace.visualstudio.com/items?itemName=bencoleman.armview) 
![Installs](https://vsmarketplacebadge.apphb.com/installs-short/bencoleman.armview.svg)

This extension displays a graphical preview of Azure Resource Manager (ARM) templates. The view will show all resources with the official Azure icons and also linkage between the resources. Uses the [Cytoscape.js library](http://js.cytoscape.org/)

![s1](assets/readme/screen1.png)

![s2](assets/readme/screen2.png)

![s3](assets/readme/screen3.png)

# Usage
- Open a ARM template JSON file, and ensure it is active/focused
  - Click the eye symbol in the top right of the editor tab bar
- Or:
  - Open the VS Code command pallet with `Ctrl+Shift+P` or `⇧⌘P` on a mac
  - Start typing `ARM Viewer`
  - Pick `ARM Viewer: Preview ARM file graphically` from the list
- Or:
  - Use keyboard shortcut `Ctrl+Alt+Q`


## Features
- Click on a resource to show popup 'infobox' for that resource
- Click 'LABELS' button to toggle labels from resource names to resource types
- Click 'FIT' button to refit the view to the best zoom level
- Click 'LAYOUT' button to re-layout icons in default way

# Notes
This is a port of a older *ARM Viewer* project, which was a standalone Node.js webapp https://github.com/benc-uk/azure-armviewer

This project was inspired by the old ARMViz tool. ARMViz sadly seems to have been abandoned, it often has problems displaying templates, and personally I found the appearance of the output looked poor, and was hard to read. These are some of the reasons why I created this project

# Limitations & Known Issues 
- The code attempts to find the links (`dependsOn` relationships) between ARM resources, however due to the *many* subtle and complex ways these relationships can be defined & expressed, certain links may not be picked up & displayed.
- Icons for the most commonly used & popular resource types have been added, however not every resource is covered (There's simply too many and no canonical source). The default ARM cube icon will be shown as a fallback. Get in touch if you want a icon added for a particular resource type.
- Resolving names & other properties for resources is attempted, but due to programmatic way these are generally defined with ARM functions and expressions, full name resolution is not always possible
- Templates using the loop functions `copy` & `copyIndex` to create multiple resources will not be rendered correctly due to limitations on evaluating the dynamic iterative state of the template     

## Running/Debugging Locally

- Open this example in VS Code 1.25+
- `npm install`
- `npm run watch` or `npm run compile`
- `F5` to start debugging
