interface NavigateOptions {
  replace?: boolean;
}

export function navigateToFragment(id: string, { replace = false }: NavigateOptions = {}) {
  const el = document.getElementById(id);
  if (!el) {
    return;
  }

  el.scrollIntoView({ behavior: "smooth" });

  const url = new URL(window.location.href);
  url.hash = id;
  if (replace) {
    history.replaceState(null, "", url);
  } else {
    history.pushState(null, "", url);
  }
}
