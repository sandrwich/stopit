import type { MemeManifest } from '../types/manifest.ts';

export function createDefaultManifest(): MemeManifest {
  return {
    version: 1,
    canvasWidth: 800,

    background: {
      from: '#c9dff0',
      to: '#f0f0f0',
      direction: 'to top left',
    },

    content: `## STOP DOING COMPUTER SCIENCE

- Computers were supposed to solve math, NOT to be programmed
- C is a **LETTER**, not a language
- Wanna print() something? Write it in a **PAPER** with a **PEN**
- "I'm writing a recursive method with threads to optimize the CPU usage in a 0.02%" **THIS IS A NONSENSICAL STATEMENT MADE BY DERANGED PEOPLE**

Look at what **PROGRAMMERS** have been demanding your respect for,
after all the led lights we put in their computers:

**(This is real COMPUTER SCIENCE, done by real COMPUTER SCIENTISTS):**

![FUNNY COLORED LETTERS](image:0) ![178 COMPILATION ERRORS?????](image:1) ![A FAKE TEAPOT YOU CAN'T USE](image:2)

**IF PROGRAMMING WAS REAL HOW COME NOBODY THOUGHT IN DOING**
\`while(true){ print(money); }\`

**THEY PLAYED US FOR ABSOLUTE FOOLS**`,

    images: [
      { src: '', alt: 'Colorful code', generationPrompt: 'Terminal window with colorful syntax-highlighted code, multiple files open' },
      { src: '', alt: 'Compilation errors', generationPrompt: 'IDE showing 178 compilation errors in red, dense error log' },
      { src: '', alt: 'Utah teapot', generationPrompt: '3D rendered Utah teapot, classic computer graphics wireframe' },
    ],
  };
}
