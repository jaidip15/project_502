// Are you here
// Listen to backgroud script Messages
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        console.log(sender.tab ?
            "from a content script:" + sender.tab.url :
            "from the extension");
        //   Do some acts here

        // Remove notive if exists
        $(".notive").remove()

        var notive = $('<div class="notive" />');
        var notive_message = $('<span class="notive_msg" id="notive_msg"></div>');

        var notive_button = $('<button class="notive_button" id="notive_button"></button>');
        var notive_cancel = $('<span class="notive_cancel" id="notive_cancel">&times;</span>');
        notive_button.append(notive_cancel)
        notive.append(notive_message, notive_button)

        if (request.messageType == "scanFile") {
            // File is scanning

            // notive.append(notive_message, notive_button)
            notive_message.html('Scanning PDF files... Checking for viruses')
            notive_button.html('Scanning...')
            notive_button.append(notive_cancel)
            notive_button.attr('class', 'notive_button scanning_msg')
            $("body").append(notive)
        } else if (request.messageType == "suspFile") {
            $("#notive").remove()
            // File is downloading
            notive_message.html('This PDF file containts suspected virus elements...')
            notive_button.html('Cancel')
            notive_button.attr('class', 'notive_button cancel_msg')
            var download_button = $('<button class="notive_button danger_download_msg" id="download_button" />')
            download_button.html('Download anyway?')
            // download_button.attr('onClick', `doLastDownload('${request.file_url}')`)
            download_button.click(function () {
                doLastDownload(`${request.file_url}`, `${request.file_id}`)
            })
            notive_button.click(function () {
                $(".notive").fadeOut(
                    function () {
                        $(this).remove()
                    })
            })
            notive.append(download_button)
            $("body").append(notive)
        } else if (request.messageType == "ddingFile") {
            $("#notive").remove()
            // File is downloading
            notive_message.html('File is being downloaded...')
            notive_button.html('Downloading')
            notive_button.append(notive_cancel)
            notive_button.attr('class', 'notive_button downloaded_msg')
            $("body").append(notive)
        } else if (request.messageType == "errFile") {
            $("#notive").remove()
            // File is downloading
            if (request.msgToSend) {
                notive_message.html(request.msgToSend)
            } else {
                notive_message.html('Sorry, error occured while scanning the file.')
            }
            notive_button.html('OK')
            notive_button.click(function () {
                $(".notive").fadeOut(
                    function () {
                        $(this).remove()
                    })
            })
            // notive_button.append(notive_cancel)
            notive_button.attr('class', 'notive_button downloaded_msg')
            $("body").append(notive)
        } else if (request.messageType == "ddedFile") {
            // File is downloaded
            notive_message.html('Your file has been downloaded...')
            notive_button.html('Open')
            notive_button.append(notive_cancel)
            notive_button.attr('class', 'notive_button downloaded_msg')

            // Open the downloaded file
            notive_button.click(function () {
                chrome.runtime.sendMessage({
                    messageType: "doOpen",
                }, function (response) {});
            })
            $("body").append(notive)
        }
        if (request.messageType != 'suspFile') {
            time_in_seconds = parseInt(time_in_seconds) || 1;
            elem = ".notive"
            time_in_seconds = time_in_seconds * 1000
            setTimeout(function () {
                $(elem).fadeOut(function () {
                    $(this).remove()
                })
            }, time_in_seconds)
        } else {

        }
    });

function doLastDownload(url, file_id) {
    // Send downloaded message
    chrome.runtime.sendMessage({
        messageType: "doDDD",
        msg_url: url,
        msg_id: file_id
    }, function (response) {});
}

function timeElemRemove(elem, time_in_seconds) {
    time_in_seconds = parseInt(time_in_seconds) || 1;

    time_in_seconds = time_in_seconds * 1000
    setTimeout(function () {
        $(elem).fadeOut(function () {
            $(this).remove()
        })
    }, time_in_seconds)
}