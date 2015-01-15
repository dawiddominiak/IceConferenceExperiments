navigator.getUserMedia = (
	navigator.getUserMedia || 
	navigator.webkitGetUserMedia ||
	navigator.mozGetUserMedia ||
	navigator.mozGetUserMedia
);

if(navigator.getUserMedia) {
	navigator.getUserMedia(
		{
			video: true,
			audio: true
		},
		function(stream) {
			var video = document.querySelector('video');
			video.src = window.URL.createObjectURL(stream);
			video.play();
		},
		function(error) {
			throw new Error(error);
		}
	);
} else {
	throw new Error('navigator.getUserMedia not supported in your browser');
}