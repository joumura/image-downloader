import * as React from 'react';
import { Component } from '../dom';
import { Options } from '../options/Options';
import { Services } from './Services';
import { Subscription } from './Subscription';

class State {
  static toggleImageSelection = (imageUrl: string) => (state: Readonly<State>) => {
    const imageIsSelected = state.selectedImages.indexOf(imageUrl) !== -1;
    return {
      selectedImages: imageIsSelected
        ? state.selectedImages.filter((url) => url !== imageUrl)
        : [...state.selectedImages, imageUrl],
    };
  };

  allImages: string[] = [];
  visibleImages: string[] = [];
  selectedImages: string[] = [];
  options = new Options();
}

export class App extends Component<{}, State> {
  readonly state = new State();
  private readonly subscriptions: Subscription[] = [];

  componentDidMount() {
    this.subscriptions.push(
      Services.onImageUrlsChanged((imageUrls) => {
        this.setState({ allImages: imageUrls, visibleImages: imageUrls });
      })
    );
  }

  componentDidUpdate(prevProps: {}, prevState: State): void {
    // TODO: Save relevant changes to local storage
  }

  componentWillUnmount() {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  render() {
    const { state } = this;
    return (
      <>
        <div className="filters">
          <div className="filterInputs">
            <input
              type="text"
              id="folder_name_textbox"
              placeholder="SAVE TO SUBFOLDER"
              title="Set the name of the subfolder you want to download the images to."
            />

            <input
              type="button"
              id="download_button"
              className="primary"
              value="DOWNLOAD"
              disabled={state.selectedImages.length === 0}
              onClick={() => this.downloadSelectedImages()}
            />

            <input
              type="text"
              id="file_renaming_textbox"
              className="renameTextbox"
              placeholder="RENAME FILES"
              title="Set a new file name for the images you want to download."
            />

            <input
              type="text"
              id="filter_textbox"
              placeholder="FILTER BY URL"
              title="Filter by parts of the URL or regular expressions."
            />

            <FilterUrlModeInput />
          </div>

          <div className="filterRanges">
            <div>Width:</div>
            <div className="text-right">
              <label htmlFor="image_width_filter_min_checkbox">
                <small id="image_width_filter_min" />
              </label>
            </div>
            <div>
              <input type="checkbox" id="image_width_filter_min_checkbox" />
            </div>
            <div>
              <div id="image_width_filter_slider" />
            </div>
            <div>
              <input type="checkbox" id="image_width_filter_max_checkbox" />
            </div>
            <div className="text-right">
              <label htmlFor="image_width_filter_max_checkbox">
                <small id="image_width_filter_max" />
              </label>
            </div>

            <div>Height:</div>
            <div className="text-right">
              <label htmlFor="image_height_filter_min_checkbox">
                <small id="image_height_filter_min" />
              </label>
            </div>
            <div>
              <input type="checkbox" id="image_height_filter_min_checkbox" />
            </div>
            <div>
              <div id="image_height_filter_slider" />
            </div>
            <div>
              <input type="checkbox" id="image_height_filter_max_checkbox" />
            </div>
            <div className="text-right">
              <label htmlFor="image_height_filter_max_checkbox">
                <small id="image_height_filter_max" />
              </label>
            </div>
          </div>

          <label
            id="only_images_from_links_container"
            className="onlyImagesFromLinks"
            title="Only show images from direct links on the page; this can be useful on sites like Reddit"
          >
            <input type="checkbox" id="only_images_from_links_checkbox" />Only images from links
          </label>
        </div>

        <div id="images_cache" className="imagesCache" />

        <div>
          <label>
            <input type="checkbox" id="toggle_all_checkbox" />
            <b>Select all ({state.visibleImages.length})</b>
          </label>
        </div>

        <div
          id="images_table"
          className="images"
          style={{ gridTemplateColumns: '1fr '.repeat(state.options.columns) }}
        >
          {state.visibleImages.map((imageUrl) => (
            <Image
              key={imageUrl}
              imageUrl={imageUrl}
              options={state.options}
              onToggleSelected={(imageUrl) => this.toggleImageSelected(imageUrl)}
              selected={state.selectedImages.indexOf(imageUrl) !== -1}
            />
          ))}
        </div>
      </>
    );
  }

  private toggleImageSelected(imageUrl: string): void {
    this.setState(State.toggleImageSelection(imageUrl));
  }

  private async downloadSelectedImages(): Promise<void> {
    const confirmed = await this.downloadConfirmation();
    if (confirmed) {
      this.state.selectedImages.forEach((imageUrl) => Services.downloadImage(imageUrl));
      // TODO: Flash notification
    }
  }

  private async downloadConfirmation(): Promise<boolean> {
    if (this.state.options.show_download_confirmation) {
      // TODO: Show warning in UI
      return window.confirm(`Take a quick look at your Chrome settings and search for the download location.

If the Ask where to save each file before downloading option is checked, continuing might open a lot of popup windows. Are you sure you want to do this?`);
    }
    return true;
  }
}

class FilterUrlModeInput extends Component<{}, {}> {
  // TODO: Show title as a styled tooltip
  private readonly options = [
    { value: 'normal', title: 'A plain text search', text: 'Normal' },
    {
      value: 'wildcard',
      text: 'Wildcard',
      title: `You can also use these special symbols:
  * → match zero or more characters
  ? → match zero or one character
  + → match one or more characters
      `,
    },
    {
      value: 'regex',
      text: 'Regex',
      title: `Regular expressions (advanced):
  [abc] → A single character of: a, b or c
  [^abc] → Any single character except: a, b, or c
  [a-z] → Any single character in the range a-z
  [a-zA-Z] → Any single character in the range a-z or A-Z
  ^ → Start of line
  $ → End of line
  \\A → Start of string
  \\z → End of string
  . → Any single character
  \\s → Any whitespace character
  \\S → Any non-whitespace character
  \\d → Any digit
  \\D → Any non-digit
  \\w → Any word character (letter, number, underscore)
  \\W → Any non-word character
  \\b → Any word boundary character
  (...) → Capture everything enclosed
  (a|b) → a or b
  a? → Zero or one of a
  a* → Zero or more of a
  a+ → One or more of a
  a{3} → Exactly 3 of a
  a{3,} → 3 or more of a
  a{3,6} → Between 3 and 6 of a
      `,
    },
  ];

  render() {
    return (
      <select id="filter_url_mode_input" className="filterModeDropdown">
        {this.options.map((option) => (
          <option key={option.value} value={option.value} title={option.title}>
            {option.text}
          </option>
        ))}
      </select>
    );
  }
}

class Image extends Component<
  {
    imageUrl: string;
    onToggleSelected: (imageUrl: string) => any;
    options: Options;
    selected: boolean;
  },
  {}
> {
  render() {
    const {
      props: { imageUrl, options, onToggleSelected, selected },
    } = this;

    return (
      <div className="image">
        <input
          type="text"
          className="image_url_textbox"
          value={imageUrl}
          readOnly
          onClick={(e) => e.currentTarget.select()}
        />

        <div
          className="openImageButton"
          title="Open in new tab"
          onClick={() => Services.openImage(imageUrl)}
        >
          &nbsp;
        </div>

        <div
          className="downloadImageButton"
          title="Download"
          onClick={() => Services.downloadImage(imageUrl)}
        >
          &nbsp;
        </div>

        <img
          src={imageUrl}
          style={{
            minWidth: `${options.image_min_width}px`,
            maxWidth: `${options.image_max_width}px`,
            borderWidth: `${options.image_border_width}px`,
            ...(selected ? { borderColor: options.image_border_color } : {}),
          }}
          onClick={() => onToggleSelected(imageUrl)}
        />
      </div>
    );
  }
}