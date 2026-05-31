# extra-pr-buttons-for-github

Chrome extension that adds a one-click `#skipreview #automerge` button to GitHub PR comment forms.

![Screenshot](docs/screenshot.jpg)

## Install

Run the install script:

```bash
curl -fsSL https://raw.githubusercontent.com/guyca/extra-pr-buttons-for-github/master/install.sh | bash
```

Then follow the printed instructions to load the `dist/` folder in Chrome.

<details>
<summary>Manual installation</summary>

```bash
git clone https://github.com/guyca/extra-pr-buttons-for-github.git
cd extra-pr-buttons-for-github
yarn install && yarn build
```

Then go to `chrome://extensions/`, enable **Developer mode**, click **Load unpacked**, and select the `dist` folder.

</details>

## How it works

Detects GitHub comment forms and injects a button next to the submit button. Clicking it fills the textarea with `#skipreview #automerge` and submits. The button is disabled if you've already typed something.

## Dev

```bash
yarn dev    # dev server with HMR
yarn build  # production build → dist/
```
