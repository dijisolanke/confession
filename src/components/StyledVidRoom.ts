import styled from "styled-components";

interface OverlayProps {
  backgroundImage: string;
}

const Root = styled.div`
  video {
    height: inherit;
    width: inherit;
    object-fit: contain;
    /* filter: blur(7px); */
  }

  .local-vid-wrapper {
    display: flex;
    height: 400px;
    width: 400px;
    border: 2px solid #4c4c4cde;
    border-radius: 25px;
    z-index: -2;
  }

  .remote-vid-wrapper {
    margin-top: 150px;
    display: flex;
    height: 400px;
    width: 400px;
    border: 2px solid #4c4c4cde;
    border-radius: 25px;
    z-index: -2;
  }

  .svg-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
  }

  @media (max-width: 768px) {
    /* video {
        width: 100%;
        height: auto;
        max-height: 40vh;
        }

        .local-vid-wrapper,
        .remote-vid-wrapper {
        width: 100%;
        height: auto;
        max-height: 40vh;
        }

        .remote-vid-wrapper {
        margin-top: 20px;  // Reduced margin on mobile
        }

        .svg-overlay {
        width: 100%;
        height: 100%;
        } */
  }

  // Add a container for both videos
  .videos-container {
    /* @media (min-width: 769px) {
        flex-direction: row;
        justify-content: center;
        gap: 40px;
        align-items: flex-start;

        .remote-vid-wrapper {
            margin-top: 0;  // Remove margin when side by side
        }
        } */
  }
`;

const VideoItem = styled.div`
  position: relative;
  width: 40vw;
  height: 40vh
  /* height: auto;
    width: auto; */
  /* height: 52vh;
    width: 60%;
    aspect-ratio: 18 / 32; */

  /* @media (max-width: 900px) {
      aspect-ratio: 9 / 11;
    }
  
    video {
      width: 100%;
      height: 100%;
      border-radius: 8px;
      object-fit: cover;
  
      @media (max-width: 900px) {
        width: 60vw;
      }
    } */
`;

// Styled component for the overlay image with typed props
const Overlay = styled.div<OverlayProps>`
display: none;
  position: absolute;
  background-image: url(${(props) => props.backgroundImage});
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  border-radius: 8px; // Match the video's rounded corners
  z-index: 3;
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
