# Contributing 

If you have your own idea for another feature for the marketplace-tracker, you can either just open up an [issue](https://github.com/IceFreez3r/marketplace-tracker/issues/new/choose) or contact us through [discord](https://discord.com/invite/pwX6Xg5). Or you can also just [fork](https://github.com/IceFreez3r/marketplace-tracker/fork) the repository, implement your own feature and then open up a pull request to our repository.

## New modules

Modules need to implement the following variables:

- `static id`: A unique id. This is used to store the settings for the module. Use underscores to separate words. E.g. `offline_tracker`.
- `static displayName`: The name of the module. This is used to display the name in the settings menu.
- `static icon`: The icon of the module. This is used to display the icon in the settings menu. Use an HTML string either as an image with an idlescape icon or a svg.
- `static category`: The category of the module. This is used to display the module in the settings menu. Use one of the following categories: `economy`, `recipe`, `visual`. You can add new categories by adding them [here](tracker.js#L310) in tracker.js.

and functions:

- `constructor(tracker, settings, storage): void`: The constructor of the module. The `tracker` is the instance of the tracker class. The `settings` are the settings of your module. `storage` is the reference to the storage object. Add css nodes to the page here. Setup your own mutation observers here, but don't start them yet. 
- `onGameReady(): void`: This function is called when the the `play-area-container` finished loading. Anything that interacts directly with the game (e.g. `observer.observe(...)`) should wait for this function to be called.
- `deactivate(): void`: This function is called when the module is deactivated. Remove all your css nodes and disconnect all mutation observers here.
- `settingsMenuContent(): string|HTMLElement|[string|HTMLElement]`: You can use this function to define subsettings of your module in the settings menu. Templates for a checkmark, a select menu or similar things can be found in [`templates.js`](templates.js). Settings can be either given as a HTML string or as a HTMLElement. If you have multiple settings, you can return an (mixed) array of strings and HTMLElements. Please check the existing modules for the correct structure and css classes.
- `onAPIUpdate(): void`: This function is called when the API data is updated. You can leave this function empty if you don't need to do anything when the API data is updated.
- `settingChanged(settingId, value): void`: This function is called when a setting of your module is changed. The `settingId` is the id of the setting that was changed (without your module id prefix). The `value` is the new value of the setting. You can leave this function out if you don't have any subsettings. If you don't need to do anything when a setting is changed, you can just leave this function empty.
- `onNotify(message, data): void`: Modules can receive messages from other modules that were send through `this.tracker.notify(message, data)`. The `message` is the message that was send. The `data` is the data that was send. You can leave this function out if you don't need to receive any messages.

When your done see [Firefox extension and userscript support](#firefox-extension-and-userscript-support) to add your module to the tracker.

## Templates and utility

You can find templates for your settings menu or various svg icons in [`templates.js`](templates.js). Access them with `Templates.<template>()`. Feel free to add new ones if you think they could be useful for other modules.

There are a lot of useful functions in [`utility.js`](utility.js). You can use them in your modules. If you have a new general function, you can add it there. For functions that aren't self-explanatory, please add a JSDoc comment above the function.

## Firefox extension and userscript support

The marketplace-tracker is published as a firefox extension and a userscript. This means that you need to modify the `manifest.json` and `main.js` files to add your module to the extension. And `marketplace_tracker.user.js` to add your module to the userscript.
```js
tracker.addModule(YourModule);
```

If you use functions that are only available in one of the two, please clarify this in your pull request and make sure that the code still works in both.

## HTML injection

If you need to inject HTML into the game, either make absolutely 100% sure, that the HTML cannot contain user input of any form or just use `saveInsertAdjacentHTML(element, position, html)`. It works equivalent to `element.insertAdjacentHTML(position, html)`, but it sanitizes the HTML before it is injected. Extensions that are uploaded to the firefox addon store are automatically scanned for malicious code and `element.insertAdjacentHTML()` and `element.innerHTML =` always produce a warning.

## Style

**Indentation**: 4 spaces

**Variables**: Use camelCase for variables. Variables that can be `const` should be `const`. Don't use `var`.

**Template strings**: HTML strings should be written in template strings. This makes it easier to read and write. Unless they are very short and fit in one line, start with the first HTML element on a new line, indented one more time then the line before.
```js
function example() {
    let foo = `<span>Example</span>`;
    return `
        <div>
            <span>Example</span>
        </div>`;
}
```
