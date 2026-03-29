import { ArrowLeft, ArrowRight, DownloadSimple, X } from "@phosphor-icons/react";
import Lightbox from "yet-another-react-lightbox";
import Download from "yet-another-react-lightbox/plugins/download";
import "yet-another-react-lightbox/styles.css";

interface Slide {
  src: string;
}

interface ArticleLightboxProps {
  open: boolean;
  index: number;
  setIndex: (index: number) => void;
  setOpen: (open: boolean) => void;
  slides: Slide[];
  portalContainer: Element | null;
}

export function ArticleLightbox({
  open,
  index,
  setIndex,
  setOpen,
  slides,
  portalContainer,
}: ArticleLightboxProps) {
  return (
    <Lightbox
      open={open}
      close={() => setOpen(false)}
      index={index}
      on={{ view: ({ index: nextIndex }) => setIndex(nextIndex) }}
      slides={slides}
      plugins={[Download]}
      portal={{ root: portalContainer }}
      noScroll={{ disabled: true }}
      animation={{ fade: 250, swipe: 350 }}
      carousel={{ finite: true }}
      controller={{ closeOnBackdropClick: true }}
      render={{
        iconClose: () => <X size={18} weight="bold" />,
        iconDownload: () => <DownloadSimple size={18} weight="bold" />,
        iconPrev: () => <ArrowLeft size={18} weight="bold" />,
        iconNext: () => <ArrowRight size={18} weight="bold" />,
        ...(slides.length <= 1 && {
          buttonPrev: () => null,
          buttonNext: () => null,
        }),
      }}
      className="yarl-plum"
    />
  );
}
