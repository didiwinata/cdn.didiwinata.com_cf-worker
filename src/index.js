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

    const mainImgSrc = env.MAIN_IMAGES_URL; // Images source path eg. https://imagesource.com
    const imagePath = url.pathname; // Path from root domain used at public,  https://images.example.com/<rest of images path>, eg. /image/picture.jpg 
    const imageURL = mainImgSrc + imagePath; // Eg. https://imagesource.com/image/picture.jpg
    const user_ip = request.headers.get('CF-Connecting-IP');
    
    try {
      if (url.pathname === "/") {
        return new Response(`Status: OK, IP Address: ${user_ip}`);
      }
      
      if (url.pathname === "/favicon.ico") {
        return fetch(env.ROOT_FAVICON);
      }

      const response = await fetch(imageURL, {
        headers: { // For check at images source backend
          'Referer': env.IMAGE_DOMAIN,
          'User-Agent': 'CF-Transformations'
        },
        cf: { image: resizingOptions } });

      if (!response.ok) {
        throw new Error('Image fetch failed');
      }

      const newHeaders = new Headers(response.headers);

      newHeaders.set("Cache-Control", "public, max-age=31536000, s-maxage=31536000, immutable"); // Store on browser for 1 years
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
        let fallbackURL = `${env.FALLBACK_IMAGE_URL}${imagePath}`;
        let transformations = []; // Reconstruct image size query params Cloudflare style to ImageKit style, eg. ?width=400 to ?tr=w-400
        
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
        
        return Response.redirect(fallbackURL, 302); // Do fallback to ImageKit if Cloudflare transformations fail
      } else {
        return Response.redirect(env.IMAGE_DOMAIN, 302);
      }
    }
  }
};
