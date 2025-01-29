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
### WebRTC
The web chat functionality (video, audio, text) was built by implementing the `WebRTC` protocol. `WebRTC` is a protocol that allows for direct peer-to-peer connections so that users can send and receive data without going through a central service. It is built into most browsers!

In order to start the peer-to-peer connection, however, the users need to first somehow find each other. This is done by a procedure known as "negotiation". For this, I needed to create a central service that users will first connect to and find out about each other. For this part, I decided to implement it with the [Server](https://github.com/dijisolanke/server/tree/main) so users connect to the server which handles connecting and call negotiation management

There were two great resources that I referenced to learn how the negotiation all works:
1. [Blog post](https://webrtchacks.com/min-duration-series-part-1-perfect-negotiation/) that discusses a the "perfect negotiation" design.
2. [Developer documentation](https://w3c.github.io/webrtc-pc/#perfect-negotiation-example)  that provides an updated version with samples and comparisons to the previous implementation from the first post.
3. [WebRTC Documentation](https://blog.mozilla.org/webrtc/perfect-negotiation-in-webrtc/) which talks about the history of WebRTC and common problems that have been faced

#### *Explain like im 5*
Okay, let's imagine you and your friend want to play together, but you're in different houses. WebRTC perfect negotiation is like a special way to help you two connect and play, no matter who calls first or what games you want to play.
It's like having a magic phone that works the same way whether you're the one calling or the one answering. You don't have to worry about who does what - the magic phone takes care of everything!1
The best part is, this magic phone works the same for both of you. You don't need different instructions for calling or answering - it's all the same!1
This way, you and your friend can start playing together quickly and easily, without worrying about complicated rules or who needs to do what first.

### Frontend
The frontend was built using React, a popular javascript library for building Web applications.

### [Metered](https://www.metered.ca/tools/openrelay/) as a TURN/STUN server
STUN and TURN servers are essential for enabling WebRTC's peer-to-peer communication in various network environments. STUN servers help devices discover their public IP addresses, facilitating direct connections when possible. TURN servers provide a fallback option when direct communication is blocked by firewalls or restrictive NATs (Network Address Translation). 

#### *Explain like im 5*
Imagine you and your friend want to play catch, but you're in different rooms of a big house. STUN servers are like a helper who tells you which window to stand by so you can see each other. Most of the time, once you know where to stand, you can throw the ball directly to each other. But sometimes, there are walls in the way, and you can't see each other. That's when TURN servers come in. They're like another friend who stands where both of you can see them, catches the ball from you, and throws it to your friend. This way, you can still play catch even when you can't see each other directly!

## Key learnings

### The hardest part was understanding the Connection Process Flow

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


## ⚒️ Extending the project
List of things I would like to do if I had more time:
- Add countdown to the UI so calls timeout after 10 mins
- Add tests for react components

