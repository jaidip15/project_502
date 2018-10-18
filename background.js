chrome.runtime.onInstalled.addListener(function() {
  // App just installed
  console.log("Just installed...");

  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: {
              urlMatches: ".*://.*/?.*"
            }
          })
        ],
        actions: [new chrome.declarativeContent.ShowPageAction()]
      }
    ]);
  });

  // Set important storages
  //stores PDF files information before download-- unique id., keeps track of downloded pdf files.
  chrome.storage.local.set({
    downloadsObj: {}
  });
  chrome.storage.local.set({
    scan_tab: {}
  });
  chrome.storage.local.set({
    isActiveScan: false
  });
});

// Disable download shel
chrome.downloads.setShelfEnabled(false);

chrome.tabs.onUpdated.addListener(function(tabId) {
  // alert(document.URL);
  // Get tab details
  chrome.tabs.get(tabId, function(tabDetails) {
    console.log(tabDetails);
    tabURLDetail = tabDetails.url.split(".");
    if (tabURLDetail[tabURLDetail.length - 1].toLowerCase() == "pdf") {
      chrome.downloads.download({
        url: tabDetails.url
      });

      // Remove the tab
      chrome.tabs.remove(tabId);
    }
  });
});

chrome.downloads.onCreated.addListener(function(created_download_callback) {
  // First check if file is just downloaded

  //before actully our code(python check), brower check that file is PDF or not. 
  var filedownloadtime = new Date().getTime();
  var pdfs_ext = ["pdf"];
  var pdfs_types = ["application/pdf", "application/x-pdf"];

  // Declare properties of file to be downloaded
  var filedownload_id = created_download_callback.id;
  var file_name_arr = created_download_callback.filename.split(".");
  var finalUrl = created_download_callback.finalUrl;
  var file_url_arr = finalUrl.split(".");
  var file_name = file_name_arr[0];
  var file_name_ext = file_name_arr[file_name_arr.length - 1];

  var final_url_ext = file_url_arr[file_url_arr.length - 1];
  var file_type = created_download_callback.mime;

  chrome.storage.local.get(["downloadsObj", "isActiveScan"], function(
    downloads_result
  ) {
    // Get downloads storage
    var downloadRack = downloads_result.downloadsObj;

    // Check if download has been checked

    if (finalUrl in downloadRack) {
      var isFullyIn = downloadRack[finalUrl].isFullyIn;
      // if (isFullyIn) {
      // File has already been downladed
      chrome.tabs.query(
        {
          active: true,
          currentWindow: true
        },
        function(tabs) {
          var ext_url = chrome.runtime.getURL("app-contents/index.html");
          determineInject(tabs[0].id, ext_url, function(tab_id) {
            chrome.tabs.sendMessage(
              tab_id,
              {
                messageType: "ddedFile",
                file_url: finalUrl
              },
              function(response) {}
            );
          });
        }
      );

      // Unset from download history
      delete downloadRack[finalUrl];
      chrome.storage.local.set({
        downloadsObj: downloadRack
      });
      return false;
    }
    // Get important values from filenames callback
    if (
      pdfs_ext.includes(file_name_ext) ||
      pdfs_ext.includes(final_url_ext) ||
      pdfs_types.includes(file_type)
    ) {
      // alert(file_name_ext+' '+final_url_ext+' '+file_type)
      chrome.downloads.cancel(filedownload_id, function() {
        chrome.downloads.erase(
          {
            id: filedownload_id
          },
          function(filedownload_callback) {
            // Set unique to downloads rack to recoginize it again
            var file_uniquified_id = `appPDF_${filedownloadtime}`;

            // Update the downloadRack storage

            chrome.tabs.query(
              {
                active: true,
                currentWindow: true
              },
              function(tabs) {
                var ext_url = chrome.runtime.getURL("app-contents/index.html");
                determineInject(tabs[0].id, ext_url, function(tab_id) {
                  chrome.tabs.sendMessage(
                    tab_id,
                    {
                      messageType: "scanFile",
                      file_url: finalUrl
                    },
                    function(array_of_results) {
                      // Scan for the virus

                      var file_url = finalUrl;
                      var api_path = chrome.i18n.getMessage("apiPath");

                      var dataPOST = {
                        file_path: file_url,
                        uniquified_id: file_uniquified_id
                      };
                      var downloadUrl = new URL(finalUrl);
                      var hostn = downloadUrl.hostname;
                      getAllCookies(hostn, function(the_cookies) {
                        var site_cookies = returnAllCookies(the_cookies);

                        if (site_cookies.length > 0) {
                          var expanded_cookies = Object.assign(...site_cookies);

                          var current_cookie = JSON.stringify(expanded_cookies);

                          dataPOST.cookies = current_cookie;
                          dataPOST.siteHost = hostn;
                        }
                        $.ajax({
                          url: api_path,
                          method: "POST",
                          data: dataPOST,
                          success: function(resp) {
                            var file_suspected_elems =
                              resp.peepdf_analysis.advanced[0].version_info
                                .suspicious_elements;
                            console.log(file_suspected_elems);
                            var is_suspected =
                              file_suspected_elems.actions &&
                              Object.keys(file_suspected_elems.actions).length >
                                0;

                            console.log(is_suspected);

                            if (!is_suspected) {
                              // File is safe
                              // Now allow download
                              // Set the downloadRack
                              downloadRack[finalUrl] = {
                                url: finalUrl,
                                isFullyIn: false
                              };
                              chrome.storage.local.set({
                                downloadsObj: downloadRack
                              });
                              chrome.tabs.query(
                                {
                                  active: true,
                                  currentWindow: true
                                },
                                function(tabs) {
                                  doLastDownload(tabs[0].id, finalUrl);
                                  
                            // Pass a message that file is being downloaded
                            chrome.tabs.query(
                                {
                                  active: true,
                                  currentWindow: true
                                },
                                function(tabs) {
                                  var ext_url = chrome.runtime.getURL(
                                    "app-contents/index.html"
                                  );
                                  determineInject(tabs[0].id, ext_url, function(
                                    tab_id
                                  ) {
                                    chrome.tabs.sendMessage(
                                      tab_id,
                                      {
                                        messageType: "ddingFile",
                                        file_url: finalUrl
                                      },
                                      function(response) {}
                                    );
                                  });
                                }
                              );
                              return false;
                            
                                }
                              );
                            } else {
                              // Raise Alarm that file contains virus
                              // alert("File is suspicious and contains virus")
                              chrome.tabs.query(
                                {
                                  active: true,
                                  currentWindow: true
                                },
                                function(tabs) {
                                  var ext_url = chrome.runtime.getURL(
                                    "app-contents/index.html"
                                  );
                                  determineInject(tabs[0].id, ext_url, function(
                                    tab_id
                                  ) {
                                    chrome.tabs.sendMessage(
                                      tab_id,
                                      {
                                        messageType: "suspFile",
                                        file_url: finalUrl
                                      },
                                      function(response) {}
                                    );
                                  });
                                }
                              );
                              return false;
                            }
                          },
                          error: function(resp) {
                              if(resp.status == 404)
                              {
                                  var msgtosend = 'Error: PDF File Not Found!'
                              } else {
                                  var msgtosend = ''
                              }
                            // Raise Alarm error occured while downloading the file
                            chrome.tabs.query(
                              {
                                active: true,
                                currentWindow: true
                              },
                              function(tabs) {
                                var ext_url = chrome.runtime.getURL(
                                  "app-contents/index.html"
                                );
                                determineInject(tabs[0].id, ext_url, function(
                                  tab_id
                                ) {
                                  chrome.tabs.sendMessage(
                                    tab_id,
                                    {
                                      messageType: "errFile",
                                      msgToSend: msgtosend,
                                      file_url: finalUrl
                                    },
                                    function(response) {}
                                  );
                                });
                              }
                            );
                            return false;
                          }
                        });
                      });
                    }
                  );
                });
              }
            );
          }
        );
      });
    }
  });
});
/*
chrome.downloads.onChanged.addListener(function (download_ids) {
    // Handle files that has been downloaded
    // Log file downloads properties
})
*/
//
function doLastDownload(tab_id, url) {
  chrome.downloads.download(
    {
      url: url
    },
    function(callback) {
      // Send message
      var ext_url = chrome.runtime.getURL("app-contents/index.html");
      determineInject(tab_id, ext_url, function(tab_id) {
        chrome.tabs.query(
          {
            active: true,
            currentWindow: true
          },
          function() {
            chrome.tabs.sendMessage(
              tab_id,
              {
                messageType: "ddinFile",
                file_url: url
              },
              function(response) {}
            );
          }
        );
      });
    }
  );
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log(
    sender.tab
      ? "from a content script:" + sender.tab.url
      : "from the extension"
  );
  //   Do some acts here
  if (request.messageType == "doDDD") {
    // Download info sent
    chrome.storage.local.set(
      {
        downloadsObj: {
          [request.msg_url]: {
            isFullyIn: true,
            url: request.msg_url
          }
        }
      },
      function(callback) {
        chrome.tabs.query(
          {
            active: true,
            currentWindow: true
          },
          function(tabs) {
            doLastDownload(tabs[0].id, request.msg_url);
          }
        );
      }
    );
  }

  if (request.messageType == "doOpen") {
    // Goto downloads
    focusOrCreateTab("chrome://downloads", function() {});
  }
});

function createTab(tab_url) {
  chrome.tabs.create(
    {
      url: tab_url
    },
    function(callback) {
      chrome.storage.local.set({
        scan_tab: callback
      });
    }
  );
}

// On Determing Filename
chrome.downloads.onDeterminingFilename.addListener(function(item, suggest) {
  suggest({
    filename: item.filename,
    conflictAction: "uniquify"
  });
});

function focusOrCreateTab(url, callback) {
  chrome.windows.getAll(
    {
      populate: true
    },
    function(windows) {
      var existing_tab = null;
      for (var i in windows) {
        var tabs = windows[i].tabs;
        for (var j in tabs) {
          var tab = tabs[j];
          if (tab.url == url) {
            existing_tab = tab;
            break;
          }
        }
      }
      if (existing_tab) {
        chrome.tabs.update(
          existing_tab.id,
          {
            selected: true
          },
          function(newTab) {
            callback(existing_tab.id);
          }
        );
      } else {
        chrome.tabs.create(
          {
            url: url,
            selected: true
          },
          function(newTab) {
            callback(newTab.id);
          }
        );
      }
    }
  );
}

function determineInject(tab_id = null, ext_url, callback) {
  canInjectTab(tab_id, function(canInject) {
    if (canInject) {
      // alert('canInject')
      callback(tab_id);
    } else {
      // alert('cantInject')
      focusOrCreateTab(ext_url, callback);
    }
  });
}

function canInjectTab(tab_id = null, callback) {
  chrome.tabs.query(
    {
      active: true,
      currentWindow: true
    },
    function(tabs) {
      chrome.tabs.executeScript(tab_id, {}, function() {
        callback(!chrome.runtime.lastError);
      });
    }
  );
}

function getAllCookies(url, callback) {
  chrome.cookies.getAll(
    {
      domain: url
    },
    function(cookies) {
      callback(cookies);
    }
  );
}

function returnAllCookies(cookArrs) {
  return cookArrs.map(function(elem) {
    return {
      [elem.name]: elem.value
    };
  });
}

String.prototype.rtrim = function(s) {
  if (s == undefined) s = "\\s";
  return this.replace(new RegExp("[" + s + "]*$"), "");
};
String.prototype.ltrim = function(s) {
  if (s == undefined) s = "\\s";
  return this.replace(new RegExp("^[" + s + "]*"), "");
};
