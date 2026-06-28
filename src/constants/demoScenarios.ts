export interface DemoScenario {
  type: "pothole" | "garbage" | "water" | "streetlight";
  label: string;
  category: string;
  image: string;
  citizenName: string;
  contact: string;
  location: string;
  description: string;
  answers: Array<{ question: string; answer: string }>;
}

export const demoScenarios: DemoScenario[] = [
  {
    type: "pothole",
    label: "Pothole",
    category: "Pothole",
    image: "/test_images/pothole.jpg",
    citizenName: "Kapil Kishore",
    contact: "kapil06@gmail.com",
    location: "Vidyaranyapura, Bengaluru",
    description: "A large, deep pothole has formed near the main circle, causing severe vehicle slowdowns and water pooling.",
    answers: [
      { question: "How deep is the pothole?", answer: "It is about 6 inches deep." },
      { question: "Are there any safety barricades present?", answer: "No, there are no barricades or signs." },
      { question: "How long has it been there?", answer: "It has been expanding for over a week." }
    ]
  },
  {
    type: "garbage",
    label: "Garbage Accumulation",
    category: "Garbage",
    image: "/test_images/garbage.jpg",
    citizenName: "Kapil Kishore",
    contact: "kapil06@gmail.com",
    location: "Koramangala 4th Block, Bengaluru",
    description: "Solid waste is overflowing onto the pavement from the public dumpster, attracting pests and blocking pedestrian access.",
    answers: [
      { question: "What type of waste is predominant?", answer: "Household garbage and plastic bags." },
      { question: "Does it emit strong odor?", answer: "Yes, extremely foul smell." },
      { question: "Is it blocking traffic?", answer: "No, but it blocks the entire sidewalk." }
    ]
  },
  {
    type: "water",
    label: "Water Leakage",
    category: "Water Leakage",
    image: "/test_images/water_pipe_burst.jpg",
    citizenName: "Kapil Kishore",
    contact: "kapil06@gmail.com",
    location: "Whitefield Main Road, Bengaluru",
    description: "An underground potable water line seems to have cracked, resulting in water continuously bubbling up onto the street.",
    answers: [
      { question: "Is water flooding nearby houses?", answer: "No, but it is creating large puddles on the road." },
      { question: "How long has water been flowing?", answer: "Flowing since early this morning." },
      { question: "Is pressure high or low?", answer: "It appears to be a medium flow." }
    ]
  },
  {
    type: "streetlight",
    label: "Broken Streetlight",
    category: "Broken Lights",
    image: "/test_images/streetlight.jpg",
    citizenName: "Kapil Kishore",
    contact: "kapil06@gmail.com",
    location: "Jayanagar 3rd Block, Bengaluru",
    description: "The streetlight fixture at the corner is completely dark at night, making the lane unsafe for children and elderly.",
    answers: [
      { question: "Is the light completely dark or flickering?", answer: "Completely dark." },
      { question: "Are other streetlights working?", answer: "Yes, only this specific post is broken." },
      { question: "How long has it been broken?", answer: "Broken for about 5 days." }
    ]
  }
];
