self.addEventListener("fetch", function (event) {
  console.log("Intercepted fetch request for:", event.request.url);
  if (event.request.url.includes("http://")) {
    event.respondWith(fetch(event.request));
  }
});
