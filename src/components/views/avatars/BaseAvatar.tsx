/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2018 New Vector Ltd
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2019, 2020 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import React, { useCallback, useContext, useEffect, useState } from 'react';
import classNames from 'classnames';
import * as AvatarLogic from '../../../Avatar';
import SettingsStore from "../../../settings/SettingsStore";
import AccessibleButton from '../elements/AccessibleButton';
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import { useEventEmitter } from "../../../hooks/useEventEmitter";
import { toPx } from "../../../utils/units";
import { ResizeMethod } from "../../../Avatar";
import { _t } from '../../../languageHandler';

interface IProps {
    name: string; // The name (first initial used as default)
    idName?: string; // ID for generating hash colours
    title?: string; // onHover title text
    url?: string; // highest priority of them all, shortcut to set in urls[0]
    urls?: string[]; // [highest_priority, ... , lowest_priority]
    width?: number;
    height?: number;
    // XXX: resizeMethod not actually used.
    resizeMethod?: ResizeMethod;
    defaultToInitialLetter?: boolean; // true to add default url
    onClick?: React.MouseEventHandler;
    inputRef?: React.RefObject<HTMLImageElement & HTMLSpanElement>;
    className?: string;
    style?: React.CSSProperties;
}

const calculateUrls = (url, urls) => {
    // work out the full set of urls to try to load. This is formed like so:
    // imageUrls: [ props.url, ...props.urls ]

    let _urls = [];
    if (!SettingsStore.getValue("lowBandwidth")) {
        _urls = urls || [];

        if (url) {
            // copy urls and put url first
            _urls = [url, ..._urls];
        }
    }

    // deduplicate URLs
    return Array.from(new Set(_urls));
};

const useImageUrl = ({url, urls}): [string, () => void] => {
    const [imageUrls, setUrls] = useState<string[]>(calculateUrls(url, urls));
    const [urlsIndex, setIndex] = useState<number>(0);

    const onError = useCallback(() => {
        setIndex(i => i + 1); // try the next one
    }, []);

    useEffect(() => {
        setUrls(calculateUrls(url, urls));
        setIndex(0);
    }, [url, JSON.stringify(urls)]); // eslint-disable-line react-hooks/exhaustive-deps

    const cli = useContext(MatrixClientContext);
    const onClientSync = useCallback((syncState, prevState) => {
        // Consider the client reconnected if there is no error with syncing.
        // This means the state could be RECONNECTING, SYNCING, PREPARED or CATCHUP.
        const reconnected = syncState !== "ERROR" && prevState !== syncState;
        if (reconnected) {
            setIndex(0);
        }
    }, []);
    useEventEmitter(cli, "sync", onClientSync);

    const imageUrl = imageUrls[urlsIndex];
    return [imageUrl, onError];
};

const BaseAvatar = (props: IProps) => {
    const {
        name,
        idName,
        title,
        url,
        urls,
        width = 40,
        height = 40,
        resizeMethod = "crop", // eslint-disable-line @typescript-eslint/no-unused-vars
        defaultToInitialLetter = true,
        onClick,
        inputRef,
        className,
        style,
        ...otherProps
    } = props;

    const [imageUrl, onError] = useImageUrl({url, urls});

    if (!imageUrl && defaultToInitialLetter) {
        const styleProp: React.CSSProperties = {
            ...style,
            fontSize: toPx(width * 0.65),
            width: toPx(width),
            height: toPx(height),
            background: `url(${AvatarLogic.defaultAvatarUrlForString(idName || name)})`,
            borderRadius: "50%",
        };

        if (onClick) {
            return (
                <AccessibleButton
                    aria-label={_t("Avatar")}
                    {...otherProps}
                    element="span"
                    className={classNames("mx_BaseAvatar", className)}
                    onClick={onClick}
                    inputRef={inputRef}
                    data-initial={defaultToInitialLetter ? AvatarLogic.getInitialLetter(name) : null}
                    style={styleProp}
                />
            );
        } else {
            return (
                <span
                    className={classNames("mx_BaseAvatar", className)}
                    ref={inputRef}
                    {...otherProps}
                    role="presentation"
                    data-initial={defaultToInitialLetter ? AvatarLogic.getInitialLetter(name) : null}
                    style={styleProp}
                />
            );
        }
    }

    if (onClick) {
        return (
            <AccessibleButton
                className={classNames("mx_BaseAvatar mx_BaseAvatar_image", className)}
                element='img'
                src={imageUrl}
                onClick={onClick}
                onError={onError}
                style={{
                    ...style,
                    width: toPx(width),
                    height: toPx(height),
                }}
                title={title} alt={_t("Avatar")}
                inputRef={inputRef}
                {...otherProps} />
        );
    } else {
        return (
            <img
                className={classNames("mx_BaseAvatar mx_BaseAvatar_image", className)}
                src={imageUrl}
                onError={onError}
                style={{
                    ...style,
                    width: toPx(width),
                    height: toPx(height),
                }}
                title={title} alt=""
                ref={inputRef}
                {...otherProps} />
        );
    }
};

export default BaseAvatar;
export type BaseAvatarType = React.FC<IProps>;
