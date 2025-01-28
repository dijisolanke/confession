// StyledInput.ts
import styled, { keyframes } from "styled-components";

const surgeAnimation = keyframes`

 0% { clip-path: inset(0 99% 99% 0); }
  25% { clip-path: inset(0 0 90% 90%); }
  50% { clip-path: inset(99% 0 0 90%); }
  75% { clip-path: inset(90% 90% 0 0); }
  100% { clip-path: inset(0 90% 99% 0); }
`;

export const InputContainer = styled.div`
  margin: -20px auto 0 auto;
  position: relative;
  width: fit-content;
`;

export const StyledInput = styled.input`
  text-align: center;
  width: 200px;
  padding: 10px 15px;
  background: black;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 25px;
  color: #a0a0a0;
  font-size: 16px;
  position: relative;
  outline: none;

  &::placeholder {
    color: #505050;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const SurgeBorder = styled.div`
  position: absolute;
  top: -1px;
  left: -1px;
  right: -1px;
  bottom: -1px;
  border-radius: 25px;
  pointer-events: none;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border: 2px solid rgba(255, 255, 255, 0.5);
    border-radius: 25px;
    clip-path: inset(0 90% 90% 0);
    animation: ${surgeAnimation} 14s linear infinite;
  }
  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border: 2px solid #634d0b;
    border-radius: 25px;
    clip-path: inset(0 99% 99% 0);
    animation: ${surgeAnimation} 14s reverse infinite linear;
  }
`;

export const Root = styled.div`
  span {
    font-size: 9px;
    display: inline-flex;
    bottom: 24px;
    position: relative;
  }
  color: #4c4c4cde;

  button {
    margin-bottom: 29%;
    margin-top: 5%;
    width: 40%;
    align-self: center;
  }
  h1 {
    line-height: 2.1;
  }
  h2 {
    text-align: center;
    margin-top: -1px;
    color: white;
  }
  form {
    display: flex;
    flex-direction: column;
  }
  ul {
    list-style-type: none;
    padding: unset;
    text-align: center;
    font-family: DMMono, "Courier New", Courier, monospace;
  }
  li {
    color: #d8a31c;
  }
`;
