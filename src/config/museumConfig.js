// Positions are metres [x, y, z]. Rotation is in degrees about the vertical axis.
// A frame faces +Z at 0°, -X at -90°, +X at 90°, and -Z at 180°.
export const museumConfig = {
  couple: [
    {
      name: "Jayson",
      style: "masculine",
      hairStyle: "short",
      hair: "#261d19",
      skin: "#c18a68",
      top: "#f0e9db",
      pants: "#303236",
      shoes: "#292826",
    },
    {
      name: "Jamie",
      style: "feminine",
      hairStyle: "long",
      hair: "#58362a",
      skin: "#d99e7c",
      top: "#2b2727",
      pants: "#e6d8c4",
      shoes: "#805d4e",
    },
  ],
  favoriteId: "first-picture",
  finaleId: "forever",
  personalMessage:
    "If we ever forget the details, I hope we remember this feeling. Wherever life takes us, I would choose to walk beside you again.",
  memories: [
    {
      id: "day-we-met",
      order: 1,
      file: "photo01.jpg",
      title: "The Day We Met",
      date: "2023-02-14",
      description:
        "I can still remember looking up and seeing you. It was an ordinary day until that moment.",
      position: [5.96, 2.03, 3.8],
      rotation: -90,
    },
    {
      id: "first-picture",
      order: 2,
      file: "photo02.jpg",
      title: "Our First Picture",
      date: "2023-03-04",
      description:
        "We took a few tries to get this one. The bit I remember best is how much we laughed between them.",
      position: [0, 2.12, -9.96],
      rotation: 0,
    },
    {
      id: "first-date",
      order: 3,
      file: "photo03.jpg",
      title: "Our First Date",
      date: "2023-03-18",
      description:
        "One little table, two cups, and a conversation that lasted long after they went cold.",
      position: [5.96, 2.03, -6.4],
      rotation: -90,
    },
    {
      id: "favorite-smile",
      order: 4,
      file: "photo04.jpg",
      title: "My Favorite Smile",
      date: "2023-05-07",
      description:
        "You turned around just as I lifted the camera. This is the smile I always look for in a room.",
      position: [-5.96, 2.03, -6.4],
      rotation: 90,
    },
    {
      id: "happy-moments",
      order: 5,
      file: "photo05.jpg",
      title: "Our Happy Moments",
      date: "2023-07-22",
      description:
        "Some afternoons have no plans at all. Those are often the ones I wish I could keep.",
      position: [-5.96, 2.03, -0.8],
      rotation: 90,
    },
    {
      id: "adventures",
      order: 6,
      file: "photo06.jpg",
      title: "Adventures Together",
      date: "2023-10-15",
      description:
        "A new place, the long way home, and you beside me. That was everything I wanted from the trip.",
      position: [-5.96, 2.03, 4.9],
      rotation: 90,
    },
    {
      id: "favorite-person",
      order: 7,
      file: "photo07.jpg",
      title: "My Favorite Person",
      date: "2024-02-14",
      description:
        "Of all the places we have been, my favorite is still wherever I can reach for your hand.",
      position: [5.96, 2.03, -0.8],
      rotation: -90,
    },
    {
      id: "forever",
      order: 8,
      file: "photo08.jpg",
      title: "Forever With You",
      date: "2024-12-31",
      description: "Every moment with you is my favorite memory.",
      position: [0, 2.2, 9.96],
      rotation: 180,
    },
  ],
};
export const memories = [...museumConfig.memories].sort(
  (a, b) => a.order - b.order,
);
const photoRoot = import.meta.env.BASE_URL + "photos/";
export const photoURL = (memory) =>
  photoRoot + memory.file.split("/").map(encodeURIComponent).join("/");
export const fallbackURL = photoRoot + "missing.svg";
