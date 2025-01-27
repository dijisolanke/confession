import styled from "styled-components";

interface OverlayProps {
  backgroundImage: string;
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;

  video {
    height: 12.8vh;
    width: 40vw;
    object-fit: none;
    filter: blur(2px);
    border-radius: 5px;

    @media (max-width: 790px) {
      width: 50vw;
    }
  }

  // Add a container for both videos
  .videos-container {
    display: flex;
    align-items: centre;
    gap: 3rem;
    justify-content: center;
    z-index: 4;
    margin-right: 10vw;

    @media (max-width: 850px) {
      gap: 2rem;
      margin-right: unset;
    }

    @media (max-width: 850px) {
      .top-container {
        bottom: 18vh;
        height: 50vh;
        transform: perspective(264px) rotateY(-307deg);
      }
      .bottom-container {
        left: 7%;
        transform: perspective(264px) rotateY(127deg);
        bottom: 18vh;
        height: 50vh;
      }
    }
  }

  .leave-button {
    margin: 1rem auto 0 auto;
    display: flex;
  }

  .bg-img {
    position: relative;
    width: 20%;
    object-fit: contain;
    border-radius: 100%;
    opacity: 0.8;
    filter: blur(2px);
    z-index: 1; /* Place it behind other content */
    align-self: center;
    @media (max-width: 850px) {
      filter: blur(1px);
      margin-left: 10%;
      top: 35vh;
    }
  }
`;

const VideoItem = styled.div`
  position: relative;
  width: 30vw;
  height: 30vh;
  overflow: hidden;

  .local-vid {
    transform: perspective(1000px) rotateY(46deg);

    @media (max-width: 850px) {
      border: solid 2px;
      transform: scale(3) rotateY(0deg);
      height: 90%;
      width: calc(100vw * 1.03);
      margin-top: 1.6vh;
    }
  }
  .local-overlay {
    transform: perspective(1000px) rotateY(46deg);

    @media (max-width: 850px) {
      transform: rotateY(0deg);
      height: 100%;
      width: 183vw;
    }
  }

  .remote-vid {
    transform: perspective(1000px) rotateY(-46deg); /* Mirror rotate to the left */

    @media (max-width: 850px) {
      position: relative;
      z-index: -1;
      transform: scale(3) rotateY(0deg);
      width: calc(100vw * 1.03);
      height: 90%;
      margin-top: 1.6vh;
    }
  }
  .remote-overlay {
    transform: perspective(1000px) rotateY(-46deg); /* Mirror rotate to the left */

    @media (max-width: 850px) {
      transform: rotateY(0deg);
      width: 183vw;
      height: 100%;
    }
  }

  @media (max-width: 850px) {
    height: 16vh;
    width: 40vw;
    border-radius: 5%;
  }
`;

// Styled component for the overlay image with typed props
const Overlay = styled.div<OverlayProps>`
  position: absolute;
  background-image: url(${(props) => props.backgroundImage});
  top: 0;
  left: 0;

  height: 16.8vh;
  width: 40vw;

  background-size: cover;
  background-position: center;
  border-radius: 8px; // Match the video's rounded corners
  z-index: 3;

  @media (max-width: 850px) {
    height: 16vh;
    width: 50vw;
  }
`;

const Button = styled.button`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  margin: auto;
  width: 3rem; /* 48px */
  height: 3rem; /* 48px */
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
  :hover {
    background-color: rgba(0, 0, 0, 0.7);
    transition: background-color 0.2s;
  }
`;

export { Root, Overlay, VideoItem, Button };
