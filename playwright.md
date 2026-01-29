# How to install playwright
Note that I've tested it on Ubuntu/WSL2.

## Check all depended packages before install.
```
npx playwright install-deps --dry-run
```

## Install them (if you are happy with them)
```
npx playwright install-deps
```

## Install playwright
```
npx playwright install
```

## Test it
```
playwright-cli open https://demo.playwright.dev/todomvc/ --headed
```

### Error?
If you got an error message like:
```
### Error
### Error
Error: browserType.launchPersistentContext: Chromium distribution 'chrome' is not found at /opt/google/chrome/chrome
Run "npx playwright install chrome"
```

#### Install Chrome
```
npx playwright install chrome"
```

# Finally, install playwright-cli SKILL for your Claude Code
On your Claude Code, run:
```
/plugin marketplace add microsoft/playwright-cli
/plugin install playwright-cli
```