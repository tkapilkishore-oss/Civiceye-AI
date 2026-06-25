export const MAP_CONFIG = {
  defaultCenter: [12.9716, 77.5946] as [number, number], // Bengaluru, India center
  defaultZoom: 13,
  minZoom: 6,
  maxZoom: 18,
  defaultRegion: "Bengaluru, Karnataka, India",
  countryCodes: "in",
};

export const WARDS_LIST = [
  "Ward 1 - Hebbal & Vidyaranyapura",
  "Ward 2 - Koramangala & HSR",
  "Ward 3 - Indiranagar & Domlur",
  "Ward 4 - Jayanagar & JP Nagar",
  "Ward 5 - Peenya Industrial Zone",
  "Ward 6 - Malleshwaram & Old Town",
  "Ward 7 - Mahadevapura Zone & Marathahalli",
  "Unknown / Unable to Determine"
];

export function deriveWardFromAddress(address: any): string {
  if (!address) return "Unknown / Unable to Determine";
  
  let text = "";
  let isBengaluru = false;

  if (typeof address === "string") {
    text = address.toLowerCase();
    const hasOtherCity = text.includes("delhi") || text.includes("mumbai") || text.includes("chennai") || text.includes("kolkata") || text.includes("hyderabad") || text.includes("pune");
    const hasBlrLocalities = text.includes("hebb") || text.includes("vidya") || text.includes("hsr") || text.includes("kora") || text.includes("indira") || text.includes("doml") || text.includes("jayan") || text.includes("jp na") || text.includes("peen") || text.includes("yesh") || text.includes("malli") || text.includes("marath") || text.includes("mahadev") || text.includes("whitefield") || text.includes("kadugodi") || text.includes("hoodi") || text.includes("doddanekundi");

    if (hasBlrLocalities && !hasOtherCity) {
      isBengaluru = true;
    } else if (text.includes("bengaluru") || text.includes("bangalore")) {
      isBengaluru = true;
    }
  } else {
    const city = (address.city || address.town || address.village || address.state_district || address.city_district || "").toLowerCase();
    const county = (address.county || "").toLowerCase();
    const displayName = (address.display_name || "").toLowerCase();
    
    isBengaluru = city.includes("bengaluru") || city.includes("bangalore") || 
                  county.includes("bengaluru") || county.includes("bangalore") ||
                  displayName.includes("bengaluru") || displayName.includes("bangalore");
    
    const suburb = (address.suburb || address.neighbourhood || address.road || address.residential || address.village || address.subdivision || address.quarter || address.city_district || address.subdistrict || "").toLowerCase();
    text = `${suburb} ${displayName}`;
  }

  if (!isBengaluru) {
    return "Unknown / Unable to Determine";
  }

  if (text.includes("hebb") || text.includes("vidya") || text.includes("yelah") || text.includes("sanjay") || text.includes("rt nagar") || text.includes("r.t. nagar")) {
    return "Ward 1 - Hebbal & Vidyaranyapura";
  }
  if (text.includes("kora") || text.includes("hsr") || text.includes("madiw") || text.includes("belland") || text.includes("sarjapur")) {
    return "Ward 2 - Koramangala & HSR";
  }
  if (text.includes("indi") || text.includes("doml") || text.includes("hal") || text.includes("cv ram") || text.includes("ulsoor") || text.includes("old airport")) {
    return "Ward 3 - Indiranagar & Domlur";
  }
  if (text.includes("jayan") || text.includes("jp na") || text.includes("banash") || text.includes("basava") || text.includes("j p nagar") || text.includes("j.p. nagar")) {
    return "Ward 4 - Jayanagar & JP Nagar";
  }
  if (text.includes("peen") || text.includes("yesh") || text.includes("indus") || text.includes("dasar") || text.includes("rajaji")) {
    return "Ward 5 - Peenya Industrial Zone";
  }
  if (text.includes("malli") || text.includes("mallesh") || text.includes("sadash") || text.includes("sheshad") || text.includes("shivaji")) {
    return "Ward 6 - Malleshwaram & Old Town";
  }
  if (text.includes("marath") || text.includes("mahadev") || text.includes("whitefield") || text.includes("kadugodi") || text.includes("hoodi") || text.includes("doddanekundi")) {
    return "Ward 7 - Mahadevapura Zone & Marathahalli";
  }

  return "Unknown / Unable to Determine";
}

