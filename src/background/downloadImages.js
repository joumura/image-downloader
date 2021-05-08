/** @type {Set<{ numberOfProcessedImages: number, imagesToDownload: string[], options: any, next: () => void }>} */
const tasks = new Set();

// NOTE: Don't directly use an `async` function as a listener:
// https://stackoverflow.com/a/56483156
chrome.runtime.onMessage.addListener(startDownload);
chrome.downloads.onDeterminingFilename.addListener(suggestNewFilename);

function startDownload(message, sender, resolve) {
  if (message?.type !== 'downloadImages') return;

  downloadImages({
    numberOfProcessedImages: 0,
    imagesToDownload: message.imagesToDownload,
    options: message.options,
    next() {
      this.numberOfProcessedImages += 1;
      if (this.numberOfProcessedImages === this.imagesToDownload.length) {
        tasks.delete(this);
      }
    },
  }).then(resolve);

  return true;
}

async function downloadImages(task) {
  tasks.add(task);
  for (const image of task.imagesToDownload) {
    await new Promise((resolve) => {
      chrome.downloads.download({ url: image }, resolve);
    });
    if (chrome.runtime.lastError) {
      console.error(`${chrome.runtime.lastError.message}: ${image}`);
      task.next();
    }
  }
}

function suggestNewFilename(item, suggest) {
  const task = [...tasks][0];
  if (!task) {
    suggest();
    return;
  }

  let newFilename = '';
  if (task.options.folder_name) {
    newFilename += `${task.options.folder_name}/`;
  }
  if (task.options.new_file_name) {
    const regex = /(?:\.([^.]+))?$/;
    const extension = regex.exec(item.filename)[1];
    const numberOfDigits = task.imagesToDownload.length.toString().length;
    const formattedImageNumber = `${task.numberOfProcessedImages + 1}`.padStart(
      numberOfDigits,
      '0'
    );
    if (~task.options.new_file_name.indexOf('{')) {
      var new_file_name = task.options.new_file_name
        .replace(/\{curl\}/, item.url.replace(/.+\:\/\/(.+)/, '$1').replace(/\?.*$/, '').replace(/\//g, '_'))
        .replace(/\{name\}/, item.filename.replace('.' + extension, ''))
        .replace(/\{num\}/, formattedImageNumber)
        .replace(/\{ext\}/, extension);
      newFilename += new_file_name;
    } else {
      newFilename += `${task.options.new_file_name}${formattedImageNumber}.${extension}`;
    }
  } else {
    newFilename += item.filename;
  }

  suggest({ filename: normalizeSlashes(newFilename) });
  task.next();
}

function normalizeSlashes(filename) {
  return filename.replace(/\\/g, '/').replace(/\/{2,}/g, '/');
}
