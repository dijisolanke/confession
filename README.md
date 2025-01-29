#### *This is my favourite passion project. Its a work in progress*

## It's a two way video chat designed for anonymous confessions

<p align="center">
<img src="https://github.com/user-attachments/assets/516d75ed-4663-4e6b-9687-805c9170e062" width="300" height="300" alt=3"Des3ription of your image"> 
  <img src="https://github.com/user-attachments/assets/7cb71234-780f-4d64-ab84-f89395cd6450" width="300" height="300" alt="Description of your image"> 
</p>



# High Level Overview

- I built a [Server](https://github.com/dijisolanke/server/tree/main) hosted on Blender to handle call connections and setup private chat room url creation.

- The server uses [Metered](https://www.metered.ca/tools/openrelay/) as a TURN/STUN server

- Using typescript and React I built a UI for creating a Lobby and unique private call rooms when pair's are established

- The App is currently live on vercel [Here](https://confession-lake-five.vercel.app/)

## Technologies
### [WebRTC](https://blog.mozilla.org/webrtc/perfect-negotiation-in-webrtc/)
The web chat functionality (video, audio, text) was built by implementing the `WebRTC` protocol. `WebRTC` is a protocol that allows for direct peer-to-peer connections so that users can send and receive data without going through a central service. It is built into most browsers!

In order to start the peer-to-peer connection, however, the users need to first somehow find each other. This is done by a procedure known as "negotiation". For this, I needed to create a central service that users will first connect to and find out about each other. For this part, I decided to implement it with the [Server](https://github.com/dijisolanke/server/tree/main) so users connect to the server which handles connecting and call negotiation management

There were two great resources that I referenced to learn how the negotiation all works:
1. [Blog post](https://webrtchacks.com/min-duration-series-part-1-perfect-negotiation/) that discusses a the "perfect negotiation" design.
2. [Developer documentation](https://w3c.github.io/webrtc-pc/#perfect-negotiation-example)  that provides an updated version with samples and comparisons to the previous implementation from the first post.
3. [WebRTC Documentation](https://blog.mozilla.org/webrtc/perfect-negotiation-in-webrtc/) which talks about the history of WebRTC and common problems that have been faced

#### *Explain like im 5*
Imagine you and your friend are trying to talk to each other using special walkie-talkies. 
These walkie-talkies are so cool that they can work even when you're far apart, like in different houses!
Now, sometimes both of you might try to talk at the same time. That's where being "polite" comes in.
One of you is the "polite" friend. This friend is always ready to stop talking and listen if the other friend starts speaking. It's like saying, "Oh, you go ahead, I'll listen!"
The other friend is "impolite". This friend keeps talking even if the polite friend tries to say something at the same time.

Having one friend be polite is important because:
It stops both of you from talking over each other all the time.

It makes sure your conversation doesn't get stuck or confused.

It helps you take turns speaking nicely.

This way, no matter who starts talking first, you'll always be able to have a smooth conversation without any mix-ups!

### [React](https://vite.dev/guide/#scaffolding-your-first-vite-project)
The frontend was built using React, a popular javascript library for building Web applications.

I set this up using 
`npm create vite@latest confession --template react-ts`

I used: `npm install socket.io-client simple-peer styled-components react-router-dom`
  - Styled Components for css styling
  - Socket a JavaScript library that enables real-time, bidirectional communication between a client and server
  - Simple peer Simple-peer is a lightweight JavaScript library that simplifies WebRTC peer-to-peer communication.
    

### [Metered](https://www.metered.ca/tools/openrelay/) as a TURN/STUN server
STUN and TURN servers are essential for enabling WebRTC's peer-to-peer communication in various network environments. STUN servers help devices discover their public IP addresses, facilitating direct connections when possible. TURN servers provide a fallback option when direct communication is blocked by firewalls or restrictive NATs (Network Address Translation). 

#### *Explain like im 5*
Imagine you and your friend want to play catch, but you're in different rooms of a big house. STUN servers are like a helper who tells you which window to stand by so you can see each other. Most of the time, once you know where to stand, you can throw the ball directly to each other. But sometimes, there are walls in the way, and you can't see each other. That's when TURN servers come in. They're like another friend who stands where both of you can see them, catches the ball from you, and throws it to your friend. This way, you can still play catch even when you can't see each other directly!

## Key learnings

### The hardest part was understanding the Connection Process Flow with the crucial detail being ensuring one of the callers is polite in order to prevent race conditions

setupCall()

↓

Request TURN credentials

↓

Receive credentials

↓

Setup media stream (camera/mic)

↓

Create RTCPeerConnection

↓

Add local tracks

↓

Join room

↓

Begin offer/answer exchange

↓

If connection fails, retry setupCall()



## 🚀 Quick Start
1. Clone this repository
    ```sh
    git clone git@github.com:dijisolanke/confession.git
    ```
2. Install dependencies
    ```sh
    npm install
    ```
3. Run the app in development mode
    ```sh
    cd confession
    npm run dev
    ```
Comment out the following in this file`src/components/VideoChat.tsx`
    
  ```sh
     } else if (pc.connectionState === "closed") {
          // navigate("/");
        }

        if (localVideoRef.current?.srcObject instanceof MediaStream) {
        localVideoRef.current.srcObject
          .getTracks()
          .forEach((track) => track.stop());
      }
      // navigate("/");
      // window.location.reload();
  ```
Go to the video element, add prop src and set it to a random video url

  ```sh
      <video
            src="https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExbDJrcnR4ZzN5bjliZGg0cDA2eWw4d2M2NnUwamd0bHRpbTlrMGppdSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oEjHBa34dVLv0jnoc/giphy.webp"
            // ref={remoteVideoRef}
            autoPlay
            playsInline
            className="remote-vid"
          />
  ```
Comment out the following in this file`src/components/Lobby.tsx`

  ```sh
     if (alias) {
      socket.emit("setAlias", alias);
      // disable button on click
      // setButtonState(true);
    }
  ```

4. Open the browser and go to http://localhost:5173.



## ⚒️ Extending the project
List of things I will add in time:
- Add countdown to the UI so calls timeout after 10 mins
- Add tests for react components
- Separate the logic and clean up the codebase

