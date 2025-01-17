import styled from "styled-components";

interface OverlayProps {
  backgroundImage: string;
}

const Root = styled.div`
  video {
    height: 12.8vh;
    width: 22.8vw;
    object-fit: none;
    filter: blur(3px);
    border-radius: 5px;

    @media (max-width: 790px) {
      height: 12.8vh;
      width: 25.8vw;
    }

  }


  // Add a container for both videos
  .videos-container {

    display: flex;
    align-items: centre;
    gap: 3rem;
    justify-content: center;
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
  width: 30vw;
  height: 30vh;
  /* transform: perspective(1000px) rotateY(-124deg); */

  .local-vid{
    transform: perspective(1000px) rotateY(46deg);
    /* object-fit: cover; */
  }
  .local-overlay{
    transform: perspective(1000px) rotateY(46deg);
  }

  .remote-vid{
    transform: perspective(1000px) rotateY(124deg);
  }
  .remote-overlay{
    transform: perspective(1000px) rotateY(124deg);
  }
`;

// Styled component for the overlay image with typed props
const Overlay = styled.div<OverlayProps>`
/* display: none; */
  position: absolute;
  background-image: url(${(props) => props.backgroundImage});
  top: 0;
  left: 0;

  height: 16.8vh;
  width: 22.8vw;

  background-size: cover;
  background-position: center;
  border-radius: 8px; // Match the video's rounded corners
  z-index: 3;
  /* transform: perspective(1000px) rotateY(-20deg); */

  @media (max-width: 790px) {
      height: 15.8vh;
      width: 26.8vw;
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
