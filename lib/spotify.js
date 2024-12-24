const spotifySearch = require("spotify-search");

(async () => {
	const tracks = await spotifySearch.searchTrack("Never Gonna Give You Up");

	console.log(tracks[0].id); // 4PTG3Z6ehGkBFwjybzWkR8
	console.log(tracks[0].name); // Never Gonna Give You Up
	console.log(tracks[0].href); // https://api.spotify.com/v1/tracks/4PTG3Z6ehGkBFwjybzWkR8
	console.log(tracks[0].artists[0].name); // Rick Astley
})();