# Cobra

A Python visualizer & collaborator.

---

## Inspiration
When I was learning Python, I often get overwhelmed by the texts. At that time, I was really good at Scratch, which is a block-based language. I’m wondering, what if we use blocks to represent the python language, then it would be very easy for beginners to learn Python. Therefore, I created this Python visualizer, Cobra.

## What it does
Cobra is a Python compiler, which acts as a block coding language. But unlike other block coding language, Cobra allows you to translate the blocks into the universal Python code instead of complex javascript source code, which allows you to export your project so somewhere else.

## How we built it
I first started to build using Blockly, which is a premade block coding template. However, I quickly realized that this template implemented too many features already and I cannot customize it to convert into Python. So I decided to make the block coding from scratch using html and java script. At first there were only 3 blocks with limited features, but after testing I eventually expanded it to 4 categories of blocks and support for insertion, collaboration, and AI. The vinal version utilizes HTML, Javascript, CSS3, Pyodide for Python execution and Firebase for hosting & live share.

## Challenges we ran into
There was lot of times where the hosting runs into errors and updates could not be shared between users. So I spent some time going over the documents of firebase and recognized that I would need to first deploy a database and deploy from the root directory to let the files be deployed to web. Additionally when first developing the AI assistant the AI could not have access to the database storing the code, which took me a long time to fix, and eventually I found it's because the AI only has reference to the block code which is in html that the AI couldn't understand.

## Accomplishments that we're proud of
Actually made a block coding website from scratch.

Successfully deployed the website and the first time using firebase.

Fixed almost all bugs and created a clean interface for users.

## What we learned
Learned how to use Firebase to deploy websites.

Learned how to use Pyodide.

Learned how to make block coding out of html.

## What's next for Cobra
Make the website more stable by hosting on a more reliable server.

Set passwords for rooms to protect private information.

Fix some bugs where insertion blocks might appear white if not used.
