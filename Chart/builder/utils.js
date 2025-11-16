export const toTitleCase = (str) =>
  str
    .replace(/[_\-]+/g, " ") // replace underscores/dashes
    .replace(
      /\w\S*/g,
      (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    );
