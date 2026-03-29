interface NavigateOptions {
  replace?: boolean;
}

export function navigateToFragment(id: string, { replace = false }: NavigateOptions = {}) {
  const el = document.getElementById(id);
  if (!el) {
    return;
  }

  el.scrollIntoView({ behavior: "smooth" });

  const url = `${window.location.pathname}${window.location.search}#${id}`;
  if (replace) {
    history.replaceState(null, "", url);
  } else {
    history.pushState(null, "", url);
  }
}
