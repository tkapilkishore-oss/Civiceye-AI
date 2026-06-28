export function resolveIntelligentJurisdiction(
  city: string,
  state: string,
  category: string
): string {
  const cityClean = (city || "").trim();
  const cityLower = cityClean.toLowerCase();
  const catLower = (category || "").toLowerCase();

  // Bengaluru
  if (cityLower.includes("bengaluru") || cityLower.includes("bangalore")) {
    if (catLower.includes("water") || catLower.includes("leak") || catLower.includes("pipe")) {
      return "BWSSB (Water Supply & Sewerage)";
    }
    if (catLower.includes("garbage") || catLower.includes("trash") || catLower.includes("waste")) {
      return "BBMP Solid Waste Management";
    }
    if (catLower.includes("light") || catLower.includes("lamp") || catLower.includes("electricity") || catLower.includes("streetlight")) {
      return "BESCOM (Electricity Supply)";
    }
    return "BBMP Roads Department";
  }

  // Chennai
  if (cityLower.includes("chennai") || cityLower.includes("madras")) {
    if (catLower.includes("water") || catLower.includes("leak") || catLower.includes("pipe")) {
      return "CMWSSB (Water Supply & Sewerage)";
    }
    if (catLower.includes("garbage") || catLower.includes("trash") || catLower.includes("waste")) {
      return "Greater Chennai Corporation SWM";
    }
    if (catLower.includes("light") || catLower.includes("lamp") || catLower.includes("electricity") || catLower.includes("streetlight")) {
      return "TANGEDCO (Electricity Board)";
    }
    return "Greater Chennai Corporation Highways";
  }

  // Mumbai
  if (cityLower.includes("mumbai") || cityLower.includes("bombay")) {
    if (catLower.includes("water") || catLower.includes("leak") || catLower.includes("pipe")) {
      return "MCGM Hydraulic Engineer Dept";
    }
    if (catLower.includes("garbage") || catLower.includes("trash") || catLower.includes("waste")) {
      return "MCGM Solid Waste Management";
    }
    if (catLower.includes("light") || catLower.includes("lamp") || catLower.includes("electricity") || catLower.includes("streetlight")) {
      return "BEST Electricity Division";
    }
    return "MCGM Roads & Traffic Dept";
  }

  // Hyderabad
  if (cityLower.includes("hyderabad")) {
    if (catLower.includes("water") || catLower.includes("leak") || catLower.includes("pipe")) {
      return "HMWS&SB (Water Supply)";
    }
    if (catLower.includes("garbage") || catLower.includes("trash") || catLower.includes("waste")) {
      return "GHMC Solid Waste Management";
    }
    if (catLower.includes("light") || catLower.includes("lamp") || catLower.includes("electricity") || catLower.includes("streetlight")) {
      return "TSSPDCL (Electricity Supply)";
    }
    return "GHMC Engineering Division";
  }

  // Delhi
  if (cityLower.includes("delhi") || cityLower.includes("ncr")) {
    if (catLower.includes("water") || catLower.includes("leak") || catLower.includes("pipe")) {
      return "Delhi Jal Board (DJB)";
    }
    if (catLower.includes("garbage") || catLower.includes("trash") || catLower.includes("waste")) {
      return "MCD Solid Waste Management";
    }
    if (catLower.includes("light") || catLower.includes("lamp") || catLower.includes("electricity") || catLower.includes("streetlight")) {
      return "BSES Power Distribution";
    }
    return "MCD Works Department";
  }

  // Generic Fallbacks for other cities and states
  const resolvedCity = cityClean || "Municipal";
  if (catLower.includes("water") || catLower.includes("leak") || catLower.includes("pipe")) {
    return `${resolvedCity} Water Supply & Sewerage Board`;
  }
  if (catLower.includes("garbage") || catLower.includes("trash") || catLower.includes("waste")) {
    return `${resolvedCity} Solid Waste Management Authority`;
  }
  if (catLower.includes("light") || catLower.includes("lamp") || catLower.includes("electricity") || catLower.includes("streetlight")) {
    return `${resolvedCity} Electricity Services Division`;
  }
  return `${resolvedCity} Public Works Department (Roads)`;
}
