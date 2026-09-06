import { useContext } from "react";
import useEmblaCarousel from "embla-carousel-react";

import { ThemeContext } from "../theme/themeProvider";
import Button from "./button";

function Carousel({ children }) {

  const [emblaRef, emblaApi] = useEmblaCarousel();
  const theme = useContext(ThemeContext);

  const scrollPrev = () => emblaApi && emblaApi.scrollPrev();
  const scrollNext = () => emblaApi && emblaApi.scrollNext();

  return (
    <div
      style={{
        position: "relative",
        width: "100%"
      }}
    >

      <div
        ref={emblaRef}
        style={{
          overflow: "hidden"
        }}
      >
        <div
          style={{
            display: "flex",
            gap: theme.spacing.sm
          }}
        >
          {children}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: theme.spacing.sm
        }}
      >

        <Button
          variant="secondary"
          size="small"
          onClick={scrollPrev}
        >
          ←
        </Button>

        <Button
          variant="secondary"
          size="small"
          onClick={scrollNext}
        >
          →
        </Button>

      </div>

    </div>
  );
}

function CarouselItem({ children }) {

  return (
    <div
      style={{
        minWidth: "100%",
        flex: "0 0 100%"
      }}
    >
      {children}
    </div>
  );
}

export { Carousel, CarouselItem };