import React from 'react';
import bscLogo from '../bsc-logo.svg';

const Header = () => {
    return (
        <header className="header">
            <div className="container">
                <img src={bscLogo} alt="BSC Analytics" className="logo"/>
            </div>
        </header>
    );
};

export default Header;

