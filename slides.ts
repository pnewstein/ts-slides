interface Video {
    row_dim: number;
    col_dim: number;
    path: string;
    kind: "Video";
}

interface Image {
    path: string;
    kind: "Image";
}

interface SlideInfo {
    title: string;
    content: Video | Image;
    number: number
}

const ASPECT_RATIO = 16 / 9;
const TITLE_TEXT_RATIO = .45;
const SLIDE_NUM_TEXT_RATIO = .8;


var slide_counter = 0;
var slides: SlideInfo[] | null = null;

function setCurrentSlideInfo() {
    if (slides == null) {
        // try again in 100 ms
        setTimeout(setCurrentSlideInfo, 100);
        return;
    }
    updateslide_info(slides[slide_counter]);
}

function updateslide_info(slide_info: SlideInfo): void {
    let html: string;
    switch (slide_info.content.kind) {
        case "Image":
            html = `<img src=${slide_info.content.path}>`
            break;
        case "Video":
            html = `<video width=${slide_info.content.row_dim}`
            break;
    };
    document.getElementById("container")!.innerHTML = html;
    document.getElementById("title")!.innerHTML = slide_info.title;
    document.getElementById("number")!.innerHTML = slide_info.number.toString();
}

function updateslide_dimention() {
    const screen_height = window.innerHeight;
    const screen_width = window.innerWidth;
    var out_height: number, out_width: number;
    if (screen_height * ASPECT_RATIO > screen_width) {
        // height is too long. use width
        out_width = screen_width;
        out_height = screen_width / ASPECT_RATIO;
    } else {
        out_width = screen_height * ASPECT_RATIO;
        out_height = screen_height;
    }
    var slide = document.getElementById("slide");
    if (slide == null) {
        Error("missing slide");
        return;
    }
    slide.style.height = out_height.toString() + "px";
    slide.style.width = out_width.toString() + "px";
    if (slide.style.height == "" || slide.style.width == "") {
        Error("failed to set size :(");
    }
    const pixel_ratios = getComputedStyle(slide).getPropertyValue("grid-template-rows").split(" ");
    // handle footer text
    const header_pixels_str = pixel_ratios[0];
    const header_pixels = parseFloat(header_pixels_str.slice(0, -2));
    const title_size = (header_pixels * TITLE_TEXT_RATIO).toString() + "px";
    console.debug(title_size);
    document.getElementById("title")!.style.fontSize = title_size;
    if (document.getElementById("title")!.style.fontSize != title_size) {
        Error("failed to set title font :(");
    }
    // handle footer text
    const footer_pixels_str = pixel_ratios[2];
    const footer_pixels = parseFloat(footer_pixels_str.slice(0, -2));
    const number_string = (footer_pixels * SLIDE_NUM_TEXT_RATIO).toString() + "px";
    document.getElementById("number")!.style.fontSize = number_string;
    if (document.getElementById("number")!.style.fontSize != number_string) {
        Error("failed to set title font :(");
    }
    
}

function init_presentation(slides: SlideInfo[]) {
    const slide_info = slides[0]; // always start fresh
    updateslide_info(slide_info);
    updateslide_dimention();
    document.getElementById("slider")!.setAttribute("max", slides.length.toString());
}


console.log("test2")
document.addEventListener("DOMContentLoaded", function() {
    var button = document.getElementById("slide");
    button?.addEventListener("click", function() {
        document.getElementById("slidescreen")!.requestFullscreen().catch((err)=>{
            Error(
              `Error attempting to enable fullscreen mode: ${err.message} (${err.name})`,
            );
          });
        updateslide_dimention();
    });
});


function increment_slide(direction: -1 | 1) {
    // TODO fancy animation here
    if (slides == null) return; // no need to do anything if slides isnt loaded
    const old_slide_counter = slide_counter;
    slide_counter += direction;
    if (slide_counter < 0 || slide_counter == slides.length) {
        //  you are at the first or last slide
        slide_counter = old_slide_counter;
        return;
    }
    const slider = document.getElementById("slider") as HTMLInputElement;
    const new_slider_value = (slide_counter + 1).toString();
    slider!.value = new_slider_value;
    if (slider!.value != new_slider_value) {
        Error(`failed to set ${new_slider_value}`);
    }
    setCurrentSlideInfo();
}


document.addEventListener("keydown", event => {
    
    switch (event.key) {
        case "d":
            updateslide_dimention();
            break;
        case "ArrowLeft":
            increment_slide(-1);
            break;
        case "ArrowRight":
            increment_slide(1);
            break;
        default:
            break;
    }
});

document.getElementById("slider")!.addEventListener("input", function () {
    const slider = document.getElementById("slider") as HTMLInputElement;
    const value = slider!.value;
    if (value == null) {
        Error("failed to get slider value");
        return;
    }
    slide_counter = parseInt(value) - 1;
    setCurrentSlideInfo();

});

async function loadSlidesfromJson() {
    const response = await fetch("slides.json");
    const json_data = await response.json();
    return json_data as SlideInfo[];
}

loadSlidesfromJson().then((slide_infos) => {
    slides = slide_infos;
    init_presentation(slide_infos);
});