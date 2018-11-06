# listify

Crude tool to somewhat interactively import tracks from CSV files to Spotify
playlists

## Getting Started

Install (see below) and prepare a CSV file. The file:

- must have a header row
- must contain columns `track` and `playlists` (will be lower-cased)
  - `track` will be used for matching
  - `playlists` can contain multiple playlist names separated by `|`
- should contain columns `artist` and `album` for better matching
- may contain additional columns

Run

```
listify --help
```

for options.

### Example usage

```
listify -d ';' -o added.csv demo.csv
```

![](demo.svg)

Note: The tool will try to open a browser window to acquire a required Spotify
API access token.

### Prerequisites

listify requires [Node.js](https://nodejs.org/) 10 or newer.

### Installing

```
npm install -g @luzat/listify
```

## Built With

- [CSV for Node.js](https://csv.js.org/) - CSV handling
- [spotify-web-api-node](https://github.com/thelinmichael/spotify-web-api-node) -
  Spotify API wrapper
- see package dependencies for more

## Authors

- **Thomas Luzat** - [luzat](https://github.com/luzat)

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file
for details
