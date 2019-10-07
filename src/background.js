/* global chrome */

var defaultOptions = {
  enabled: true,
  public_gist_enabled: true,
  public_github_enabled: true
}

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status !== 'loading') {
    return
  }

  chrome.tabs.executeScript(tabId, {
    code: 'var injected = window.expandinizrInjected; window.expandinizrInjected = true; injected;',
    runAt: 'document_start'
  }, function (res) {
    if (chrome.runtime.lastError || // don't continue if error (i.e. page isn't in permission list)
        res[0]) { // value of `injected` above: don't inject twice
      return
    }

    var cssFiles = [
      'content/github-inject.min.css'
    ]

    var gistCssFiles = [
      'content/gist-inject.min.css'
    ]

    chrome.storage.sync.get(defaultOptions, function (options) {
      if ((/https:\/\/gist\.github\.com/.test(tab.url) && options.public_gist_enabled) ||
         (/https:\/\/github\.com/.test(tab.url) && options.public_github_enabled) ||
         (!/gist\.github\.com/.test(tab.url) && !/github\.com/.test(tab.url))) {
        if ((/https:\/\/gist\.github\.com/.test(tab.url) && options.public_gist_enabled) || /\/gist\//.test(tab.url)) { // if we are in a gist site, inject gist css
          if (options.enabled) {
            chrome.tabs.executeScript(tabId, {
              code: 'document.documentElement.classList.add(\'expandinizr\')',
              runAt: 'document_start'
            })
          }

          eachItem(gistCssFiles, inject('insertCSS'))
        } else if ((/https:\/\/github\.com/.test(tab.url) && options.public_github_enabled) ||
                  (!/gist\.github\.com/.test(tab.url) && !/github\.com/.test(tab.url))) { // otherwise, inject github js and css
          if (options.enabled) {
            chrome.tabs.executeScript(tabId, {
              code: 'document.documentElement.classList.add(\'expandinizr\')',
              runAt: 'document_start'
            })
          }

          eachItem(cssFiles, inject('insertCSS'))
        }
      }
    })

    function inject (fn) {
      return function (file, cb) {
        chrome.tabs[fn](tabId, { file: file, runAt: 'document_start' }, cb)
      }
    }
  })
})

chrome.runtime.onInstalled.addListener(function () {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    chrome.declarativeContent.onPageChanged.addRules([{
      actions: [ new chrome.declarativeContent.ShowPageAction() ],
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: { hostSuffix: 'github.com' } // TODO: Use permissions in some way.
        })
      ]
    }])
  })

  chrome.pageAction.onClicked.addListener(function (tab) {
    chrome.storage.sync.get(defaultOptions, function (options) {
      chrome.storage.sync.set({ enabled: !options.enabled }, function () {
        chrome.tabs.executeScript(tab.id, {
          code: 'document.documentElement.classList.toggle(\'expandinizr\')'
        })
      })
    })
  })
})

function eachTask (tasks, done) {
  function next (index) {
    if (index === tasks.length) {
      done && done()
    } else {
      tasks[index](function () { next(index + 1) })
    }
  }
  next(0)
}

function eachItem (arr, iter, done) {
  var tasks = arr.map(function (item) {
    return function (next) {
      iter(item, next)
    }
  })
  return eachTask(tasks, done)
}
