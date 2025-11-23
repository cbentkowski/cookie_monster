# Chrome Extension Cookie Monster

This Chrome extension automatically clears cookies and storage for a specified list of websites whenever a tab is closed. It provides a user-friendly interface for managing the list of websites.

## Features

- Automatically clears cookies and storage for specified websites on tab closure.
- User interface for adding and removing websites from the list.
- Options page for managing the list of websites.

## Project Structure

```
cookie-monster
├── src
│   ├── background.ts        # Background script for handling tab closure events
│   ├── content.ts          # Content script for interacting with web pages
│   ├── popup
│   │   ├── popup.html      # HTML structure for the popup interface
│   │   ├── popup.ts        # Logic for the popup interface
│   │   └── popup.css       # Styles for the popup interface
│   ├── options
│   │   ├── options.html    # HTML structure for the options page
│   │   ├── options.ts      # Logic for managing the list of websites
│   │   └── options.css     # Styles for the options page
│   └── types
│       └── index.ts        # Custom types and interfaces
├── manifest.json           # Configuration file for the Chrome extension
├── package.json            # npm configuration file
├── tsconfig.json           # TypeScript configuration file
└── README.md               # Project documentation
```

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd cookie-monster
   ```
3. Install dependencies:
   ```
   npm install
   ```

## Usage

1. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the project directory.
2. Open the popup to add or remove websites from the list.
3. The extension will automatically clear cookies and storage for the specified websites when a tab is closed.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License.
