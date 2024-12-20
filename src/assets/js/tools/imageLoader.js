let loadImage = function(id, place) {
    // load the image:
    var image = new Image();
    image.crossOrigin = "Anonymous";
    var canvas = document.getElementById(place);
    var context = canvas.getContext("2d", {willReadFrequently: true});
    var data = {};

    image.onload = function () {
        canvas.width = this.width;
        canvas.height = this.height;

        context.drawImage(this, 0, 0, image.width, image.height);
        cropImage();
    };

    image.src = `https://datawrapper.dwcdn.net/${id}/plain-s.png`;

    // crop image whitespace:
    function cropImage() {
        data = context.getImageData(0, 0, image.width, image.height).data;

        var top = scanY(true);
        var bottom = scanY(false);
        var left = scanX(true);
        var right = scanX(false);

        var new_width = right - left;
        var new_height = bottom - top;

        canvas.width = new_width;
        canvas.height = new_height;

        context.drawImage(image, left, top, new_width, new_height, 0, 0, new_width, new_height);
    }

    // get pixel RGB data:
    function getRGB(x, y) {
        return {
            red: data[((image.width * y) + x) * 4],
            green: data[((image.width * y) + x) * 4 + 1],
            blue: data[((image.width * y) + x) * 4 + 2]
        };
    }

    // check if pixel is a color other than white:
    function isColor(rgb) {
        return rgb.red === 255 && rgb.green === 255 && rgb.blue === 255;
    }

    // scan top and bottom edges of image:
    function scanY(top) {
        var offset = (top) ? 1 : -1;

        for (var y = ((top) ? 0 : image.height - 1); ((top) ? (y < image.height) : (y > -1)); y += offset) {
            for (var x = 0; x < image.width; x++) if (!isColor(getRGB(x, y))) return y;
        }

        return null;
    }

    // scan left and right edges of image:
    function scanX(left) {
        var offset = (left) ? 1 : -1;

        for (var x = ((left) ? 0 : image.width - 1); ((left) ? (x < image.width) : (x > -1)); x += offset) {
            for (var y = 0; y < image.height; y++) if (!isColor(getRGB(x, y))) return x;
        }

        return null;
    }
}

export default loadImage;