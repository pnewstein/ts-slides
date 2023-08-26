interface Video {
  row_dim: number;
  col_dim: number;
  path: string;
  kind: 'Video';
}

interface Image {
  path: string;
  kind: 'Image';
}

interface SlideInfo {
  title: string;
  content: Video | Image;
  number: number;
}

// width of each element in pixels
interface GridTemplateColumns {
  right_margin: number;
  slider: number;
  content: number;
  left_margin: number;
}

// height of each element in pixels
interface GridTemplateRows {
  top_margin: number;
  title: number;
  slider: number;
  number: number;
  bottom_margin: number;
}

const ASPECT_RATIO = 16 / 9;
const TITLE_TEXT_RATIO = 0.45;
const SLIDE_NUM_TEXT_RATIO = 0.8;
const INIT_GTC: GridTemplateColumns = {
  right_margin: 0,
  slider: 0.5,
  content: 20,
  left_margin: 0,
};

const INIT_GTR: GridTemplateRows = {
  top_margin: 0,
  title: 4,
  slider: 24,
  number: 1,
  bottom_margin: 0,
};

class NegitiveMarginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NegitiveMarginError';
  }
}

function setSlider(slider: HTMLInputElement, slide_num: number, num_slides: number) {
  const number_string = (num_slides - slide_num - 1).toString();
  slider.value = number_string;
}

function getSlider(slider: HTMLInputElement, num_slides: number): number {
  const number_string = slider.value;
  return num_slides - parseInt(number_string) - 1;
}

function updateSlideInfo(
  slide_info: SlideInfo,
  container: HTMLDivElement,
  title: HTMLDivElement,
  number: HTMLDivElement,
): void {
  let html: string;
  switch (slide_info.content.kind) {
    case 'Image':
      html = `<img src=${slide_info.content.path}>`;
      break;
    case 'Video':
      html = `<video width=${slide_info.content.row_dim}`;
      break;
  }
  container.innerHTML = html;
  title.innerHTML = slide_info.title;
  number.innerHTML = slide_info.number.toString();
}

function sumArray(in_array: number[]): number {
  return in_array.reduce((accu, next) => accu + next, 0);
}

// gets an array containing the content. Excluding the margins which are garenteed to be the first
// and last attribute of the input type
function getContentPixels(grid_template: GridTemplateColumns | GridTemplateRows): number[] {
  const contentPixels = Object.values(grid_template).slice(1, -1); // Exclude the first and last attributes (margins)
  return contentPixels;
}

// Mutates the slidescreen to update the grid template
function updateGridTemplate(
  slidescreen: HTMLDivElement,
  slide: HTMLDivElement,
  gtr: GridTemplateRows,
  gtc: GridTemplateColumns,
) {
  const slidescreen_template_rows = `${gtr.top_margin}px ${sumArray(getContentPixels(gtr))}px ${gtr.bottom_margin}px`;
  const slidescreen_template_columns = `${gtc.right_margin}px ${sumArray(getContentPixels(gtc))}px ${
    gtc.left_margin
  }px`;

  // Apply the grid template to the slidescreen element
  slidescreen.style.gridTemplateRows = slidescreen_template_rows;
  slidescreen.style.gridTemplateColumns = slidescreen_template_columns;
  slide.style.gridTemplateRows = `${gtr.title}px ${gtr.slider}px ${gtr.number}px`;
  slide.style.gridTemplateColumns = `${gtc.slider}px ${gtc.content}px`;
}

function getGridTemplate(
  type: 'GridTemplateColumns' | 'GridTemplateRows',
  shift: number,
  screen_dim: number,
  out_dim: number,
): GridTemplateColumns | GridTemplateRows {
  const init_gt = type == 'GridTemplateColumns' ? INIT_GTC : INIT_GTR;
  const row_content_ratios = getContentPixels(init_gt);
  const row_content_pixels = row_content_ratios.map((ratio) => (ratio * out_dim) / sumArray(row_content_ratios));
  const total_buffer_pixels = screen_dim - sumArray(row_content_pixels);
  if (total_buffer_pixels / 2 - Math.abs(shift) < 0) {
    throw new NegitiveMarginError('negitive margin :(');
  }
  if (type == 'GridTemplateColumns') {
    return {
      right_margin: total_buffer_pixels / 2 + shift,
      slider: row_content_pixels[0],
      content: row_content_pixels[1],
      left_margin: total_buffer_pixels / 2 - shift,
    } as GridTemplateColumns;
  } else {
    return {
      top_margin: total_buffer_pixels / 2 + shift,
      title: row_content_pixels[0],
      slider: row_content_pixels[1],
      number: row_content_pixels[2],
      bottom_margin: total_buffer_pixels / 2 - shift,
    } as GridTemplateRows;
  }
}

// updates the dimentions of the slide, incluing font sizes
// If slide_height and slide_width are null, it gets calculated so that
function updateSlideDimention(
  slide_screen: HTMLDivElement,
  title: HTMLDivElement,
  number: HTMLDivElement,
  slide: HTMLDivElement,
  slide_height: number | null,
  slide_width: number | null,
  x_shift: number,
  y_shift: number,
): { slide_height: number; slide_width: number } {
  const screen_height = window.innerHeight;
  const screen_width = window.innerWidth;
  var out_height: number, out_width: number;
  if (slide_height == null || slide_width == null) {
    if (screen_height * ASPECT_RATIO > screen_width) {
      // height is too long. use width
      out_width = screen_width;
      out_height = screen_width / ASPECT_RATIO;
    } else {
      out_width = screen_height * ASPECT_RATIO;
      out_height = screen_height;
    }
  } else {
    out_height = slide_height;
    out_width = slide_width;
  }
  // Handle grid template
  const gtc = getGridTemplate('GridTemplateColumns', x_shift, screen_width, out_width) as GridTemplateColumns;
  const gtr = getGridTemplate('GridTemplateRows', y_shift, screen_height, out_height) as GridTemplateRows;
  updateGridTemplate(slide_screen, slide, gtr, gtc);
  // handle title text
  const title_size = (gtr.title * TITLE_TEXT_RATIO).toString() + 'px';
  title.style.fontSize = title_size;
  // handle number text
  const number_string = (gtr.number * SLIDE_NUM_TEXT_RATIO).toString() + 'px';
  number.style.fontSize = number_string;
  // return calculated slide height and width
  return { slide_height: out_height, slide_width: out_width };
}

function initHtml(): {
  slide: HTMLDivElement;
  slidescreen: HTMLDivElement;
  title: HTMLDivElement;
  slider: HTMLInputElement;
  container: HTMLDivElement;
  number: HTMLDivElement;
} {
  const slidescreen = document.createElement('div');
  slidescreen.id = 'slidescreen';
  const slide = document.createElement('div');
  slide.id = 'slide';
  const slider = document.createElement('input');
  slider.id = 'slider';
  slider.type = 'range';
  slider.onkeydown = (event) => event.preventDefault();
  slider.setAttribute('orient', 'vertical');
  const title = document.createElement('div');
  title.id = 'title';
  const container = document.createElement('div');
  container.id = 'container';
  const number = document.createElement('div');
  number.id = 'number';
  slide.style.display = 'grid';
  slide.append(title, slider, container, number);
  slidescreen.style.display = 'grid';
  slidescreen.append(slide);
  return {
    slide: slide,
    slidescreen: slidescreen,
    title: title,
    slider: slider,
    container: container,
    number: number,
  };
}

// If possible, looks up next slide, updates slider, returns new slide number and current slide
function incrementSlide(
  direction: -1 | 1,
  slide_num: number,
  slides: SlideInfo[],
  slider: HTMLInputElement,
): { slide_num: number; slide_info: SlideInfo } {
  const new_slide_num = slide_num + direction;
  if (new_slide_num < 0 || new_slide_num == slides.length) {
    //  you are at the first or last slide
    const bg_color = getComputedStyle(slider).getPropertyValue('--bg-color').trim();
    const emph_color = getComputedStyle(slider).getPropertyValue('--emphisize-color').trim();
    slider.style.background = emph_color;
    setTimeout(() => (slider.style.background = bg_color), 200);
    return { slide_num: slide_num, slide_info: slides[slide_num] };
  }
  setSlider(slider, new_slide_num, slides.length);
  return { slide_num: new_slide_num, slide_info: slides[new_slide_num] };
}

function flashOutline(slide: HTMLDivElement) {
  const df_border = getComputedStyle(slide).getPropertyValue('--default-border').trim();
  const emph_border = getComputedStyle(slide).getPropertyValue('--emphisize-boarder').trim();
  slide.style.border = emph_border;
  setTimeout(() => (slide.style.border = df_border), 500);
}

function tryToWidenScreen(
  y_shift_amount: number,
  x_shift_amount: number,
  y_shift: number,
  x_shift: number,
  slide_height: number,
  slide_width: number,
  slidescreen: HTMLDivElement,
  slide: HTMLDivElement,
  title: HTMLDivElement,
  number: HTMLDivElement,
): { y_shift: number; x_shift: number; slide_height: number; slide_width: number } {
  flashOutline(slide);
  y_shift += y_shift_amount;
  slide_height += 2 * Math.abs(y_shift_amount);
  x_shift += x_shift_amount;
  slide_width += 2 * Math.abs(x_shift_amount);
  try {
    updateSlideDimention(slidescreen, title, number, slide, slide_height, slide_width, x_shift, y_shift);
  } catch (error) {
    if (!(error instanceof NegitiveMarginError)) {
      throw error;
    } else {
      y_shift -= y_shift_amount;
      slide_height -= 2 * Math.abs(y_shift_amount);
      x_shift -= x_shift_amount;
      slide_width -= 2 * Math.abs(x_shift_amount);
    }
  }
  return {
    y_shift: y_shift,
    x_shift: x_shift,
    slide_height: slide_height,
    slide_width: slide_width,
  };
}

function narrowScreen(
  y_shift_amount: number,
  x_shift_amount: number,
  y_shift: number,
  x_shift: number,
  slide_height: number,
  slide_width: number,
  slidescreen: HTMLDivElement,
  slide: HTMLDivElement,
  title: HTMLDivElement,
  number: HTMLDivElement,
): { y_shift: number; x_shift: number; slide_height: number; slide_width: number } {
  flashOutline(slide);
  y_shift += y_shift_amount;
  slide_height += -2 * Math.abs(y_shift_amount);
  x_shift += x_shift_amount;
  slide_width += -2 * Math.abs(x_shift_amount);
  updateSlideDimention(slidescreen, title, number, slide, slide_height, slide_width, x_shift, y_shift);
  return {
    y_shift: y_shift,
    x_shift: x_shift,
    slide_height: slide_height,
    slide_width: slide_width,
  };
}

function initPresentation(slides: SlideInfo[], slide_num: number) {
  // state variables
  var slide_num: number; // Current point int the presentation
  var y_shift = 0; // how far down to shift the viewer
  var x_shift = 0; // how far left to shift the viewer
  var slide_height: number;
  var slide_width: number;
  var slide_info: SlideInfo; // the current info displayed on the slide
  // make the HTML
  const html = initHtml();
  ({ slide_height, slide_width } = updateSlideDimention(
    html.slidescreen,
    html.title,
    html.number,
    html.slide,
    null,
    null,
    0,
    0,
  ));
  // put the information on the slide
  var slide_info = slides[slide_num];
  updateSlideInfo(slide_info, html.container, html.title, html.number);
  html.slider.max = (slides.length - 1).toString();
  setSlider(html.slider, slide_num, slides.length);
  document.body.append(html.slidescreen);
  // Draggable slider
  html.slider.addEventListener('input', function () {
    slide_num = getSlider(html.slider, slides.length);
    slide_info = slides[slide_num];
    updateSlideInfo(slide_info, html.container, html.title, html.number);
  });
  // keybindings
  function keyHandeler(event: KeyboardEvent) {
    switch (event.key) {
      case 'd':
        ({ slide_height, slide_width } = updateSlideDimention(
          html.slidescreen,
          html.title,
          html.number,
          html.slide,
          null,
          null,
          0,
          0,
        ));
        // reset
        y_shift = 0;
        x_shift = 0;
        break;
      case 'ArrowLeft':
        ({ slide_num, slide_info } = incrementSlide(-1, slide_num, slides, html.slider));
        updateSlideInfo(slide_info, html.container, html.title, html.number);
        break;
      case 'ArrowRight':
        ({ slide_num, slide_info } = incrementSlide(1, slide_num, slides, html.slider));
        updateSlideInfo(slide_info, html.container, html.title, html.number);
        break;
      case 'j':
        ({ y_shift, x_shift, slide_height, slide_width } = narrowScreen(
          5,
          0,
          y_shift,
          x_shift,
          slide_height,
          slide_width,
          html.slidescreen,
          html.slide,
          html.title,
          html.number,
        ));
        break;
      case 'J':
        ({ y_shift, x_shift, slide_height, slide_width } = tryToWidenScreen(
          -5,
          0,
          y_shift,
          x_shift,
          slide_height,
          slide_width,
          html.slidescreen,
          html.slide,
          html.title,
          html.number,
        ));
        break;
      case 'k':
        ({ y_shift, x_shift, slide_height, slide_width } = narrowScreen(
          -5,
          0,
          y_shift,
          x_shift,
          slide_height,
          slide_width,
          html.slidescreen,
          html.slide,
          html.title,
          html.number,
        ));
        break;
      case 'K':
        ({ y_shift, x_shift, slide_height, slide_width } = tryToWidenScreen(
          5,
          0,
          y_shift,
          x_shift,
          slide_height,
          slide_width,
          html.slidescreen,
          html.slide,
          html.title,
          html.number,
        ));
        break;
      case 'l':
        ({ y_shift, x_shift, slide_height, slide_width } = narrowScreen(
          0,
          5,
          y_shift,
          x_shift,
          slide_height,
          slide_width,
          html.slidescreen,
          html.slide,
          html.title,
          html.number,
        ));
        break;
      case 'L':
        ({ y_shift, x_shift, slide_height, slide_width } = tryToWidenScreen(
          0,
          -5,
          y_shift,
          x_shift,
          slide_height,
          slide_width,
          html.slidescreen,
          html.slide,
          html.title,
          html.number,
        ));
        break;
      case 'h':
        ({ y_shift, x_shift, slide_height, slide_width } = narrowScreen(
          0,
          -5,
          y_shift,
          x_shift,
          slide_height,
          slide_width,
          html.slidescreen,
          html.slide,
          html.title,
          html.number,
        ));
        break;
      case 'H':
        ({ y_shift, x_shift, slide_height, slide_width } = tryToWidenScreen(
          0,
          5,
          y_shift,
          x_shift,
          slide_height,
          slide_width,
          html.slidescreen,
          html.slide,
          html.title,
          html.number,
        ));
        break;
      case 'f':
        html.slidescreen
          .requestFullscreen()
          .then(
            () =>
              ({ slide_height, slide_width } = updateSlideDimention(
                html.slidescreen,
                html.title,
                html.number,
                html.slide,
                null,
                null,
                0,
                0,
              )),
          );
        break;
      case 'r':
        html.slidescreen.remove();
        document.removeEventListener('keydown', keyHandeler);
        initPresentation(slides, slide_num);
        break;
      default:
        break;
    }
  }
  document.addEventListener('keydown', keyHandeler);
}

async function loadSlidesfromJson() {
  const response = await fetch('slides.json');
  const json_data = await response.json();
  return json_data as SlideInfo[];
}

loadSlidesfromJson().then((slide_infos) => {
  initPresentation(slide_infos, 0);
});
