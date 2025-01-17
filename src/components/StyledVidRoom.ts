import styled from "styled-components";

interface OverlayProps {
  backgroundImage: string;
}

const Root = styled.div`
  h1{
    color: #4c4c4cde;
    text-align: center;
  }
  
  video {
    height: 12.8vh;
    width: 30vw;
    object-fit: none;
    filter: blur(3px);
    border-radius: 5px;

    @media (max-width: 790px) {
      /* height: 13vh; */
      width: 50vw;
    }

  }


  // Add a container for both videos
  .videos-container {

    display: flex;
    align-items: centre;
    gap: 3rem;
    justify-content: center;

    @media (max-width: 790px) {
      gap: 2rem;
    }
  }

  .leave-button{
    margin: 6rem auto 0 auto;
    display: flex;
  }
`;

const VideoItem = styled.div`
  position: relative;
  width: 30vw;
  height: 30vh;

  .local-vid{
    transform: perspective(1000px) rotateY(46deg);
    @media (max-width: 790px) {
      transform: perspective(264px) rotateY(47deg);
      height: 12vh;
    }
  }
  .local-overlay{
    transform: perspective(1000px) rotateY(46deg);
    @media (max-width: 790px) {
      transform: perspective(264px) rotateY(47deg);
      height: 16vh;
      width: 50vw;
    }
  }

  .remote-vid{
    transform: perspective(1000px) rotateY(124deg);
    @media (max-width: 790px) {
      transform: perspective(204px) rotateY(-47deg);
      height: 7vh;
      width: 50vw;
    }
  }
  .remote-overlay{
    transform: perspective(1000px) rotateY(124deg);
    @media (max-width: 790px) {
      transform: perspective(264px) rotateY(-47deg);
      height: 16vh;
      width: 50vw;
    }
  }

  @media (max-width: 790px) {
      height: 16vh;
      width: 40vw;
    }
`;

// Styled component for the overlay image with typed props
const Overlay = styled.div<OverlayProps>`
/* display: none; */
  position: absolute;
  background-image: url(${(props) => props.backgroundImage});
  top: 0;
  left: 0;

  /* height: 16.8vh; */
  width: 35vw;

  background-size: cover;
  background-position: center;
  border-radius: 8px; // Match the video's rounded corners
  z-index: 3;
  /* transform: perspective(1000px) rotateY(-20deg); */

  @media (max-width: 790px) {
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


