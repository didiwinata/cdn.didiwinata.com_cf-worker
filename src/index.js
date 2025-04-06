export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const width = url.searchParams.get("width");
    const height = url.searchParams.get("height");

    const resizingOptions = {
      width: width ? parseInt(width) : undefined,
      height: height ? parseInt(height) : undefined,
      quality: 100,
      format: 'webp'
    };

    const hiddenImageOrigin = "https://api.dget.top/didiwinata";
    const imagePath = url.pathname;
    const imageURL = hiddenImageOrigin + imagePath;

    try {
      if (url.pathname === "/") {
        return new Response(`status OK`);
      }
      
      if (url.pathname === "/favicon.ico") {
        return fetch("https://didiwinata.com/favicon.ico", {
          headers: { "Cache-Control": "max-age=31536000, immutable" },
        });
      }

      const response = await fetch(imageURL, { cf: { image: resizingOptions } });

      if (!response.ok) {
        throw new Error('Image fetch failed');
      }

      const newHeaders = new Headers(response.headers);

      newHeaders.set("Cache-Control", "max-age=31536000, immutable");
      newHeaders.set("Content-Security-Policy", "upgrade-insecure-requests");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (error) {
      console.error("Image fetch failed:", error.message);
      
      const pattern = /^\/images\/\d+\/[\w\-]+\.(webp|jpg|jpeg|png|gif)$/i;
      
      if (pattern.test(url.pathname)) {
        let fallbackURL = `https://ik.imagekit.io/zxn2e1hij${imagePath}`;

        let transformations = [];
        if (width) {
          transformations.push(`w-${width}`);
        }
        if (height) {
          transformations.push(`h-${height}`);
        }

        if (transformations.length > 0) {
          fallbackURL += `?tr=${transformations.join(",")}`;
        }
        
        console.log(`Redirecting to fallback: ${fallbackURL}`);
        
        return Response.redirect(fallbackURL, 302);
      } else {
        return Response.redirect('https://cdn.didiwinata.com', 302);
      }
    }
  },
};
