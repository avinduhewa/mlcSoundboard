'use strict';

import React, { Component, } from 'react'

import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    AsyncStorage,
    ScrollView
} from 'react-native';

import Sound from 'react-native-sound';
import RNFetchBlob from 'react-native-fetch-blob'

const MAIN_LOCAL_PATH = RNFetchBlob.fs.dirs.MainBundleDir + '/assets/'
const SOUNDS_LOCAL_PATH = MAIN_LOCAL_PATH + 'sounds/'

const MAIN_URL = 'https://mountainlaircamp.blob.core.windows.net/mlc-soundbank/'
const JSON_NAME = 'MLCSoundBank.json'

class MainView extends Component {
    constructor(props) {
        super(props)
        this.state = {
            files: []
        }
    }
    componentWillMount() {
        this.getSoundMap()
    }
    render() {
        return (
            <View style={styles.container}>
                <TouchableOpacity
                    onPress={this.sync}
                    style={{position: 'absolute', top: 30, right: 30}}>
                    <Text style={styles.button}>sync</Text>
                </TouchableOpacity>

                <ScrollView style={{marginTop: 100, marginBottom: 50}}>
                    {this.state.files.map((file, i) => this.renderFile(file, i))}
                </ScrollView>
            </View>
        )
    }
    renderFile = (file, index) => {
        return (
            <View key={index} style={styles.row}>
                <Text>{file.Name}</Text>
                    <TouchableOpacity
                        onPress={() => this.playSound(this.cleanName(file.Path))}>
                        <Text style={styles.button}>PLAY</Text>
                    </TouchableOpacity>
            </View>
        )
    }
    sync = () => {
        this.fetchJson().then((res) => {
            AsyncStorage.setItem('soundMap', JSON.stringify(res));
            res.map(obj => this.fetchRemoteFile(obj))
        })
    }
    fetchJson() {
        return RNFetchBlob
            .config({
                path : MAIN_LOCAL_PATH + JSON_NAME //target path
            })
            .fetch('GET', MAIN_URL + JSON_NAME, {})
            .then((res) => {
                return res.json()
            })
            .catch((errorMessage, statusCode) => {
                // error handling
                console.log(errorMessage)
            })
    }
    cleanUrl = (name) => {
        return name.replace(/ /g, '%20')
    }
    cleanName = (name) => {
        return name.replace(/,/g, '').replace(/ /g, '')
    }
    fetchRemoteFile = (obj) => {
        RNFetchBlob
            .config({
                path : SOUNDS_LOCAL_PATH + this.cleanName(obj.Path) //target path
            })
            .fetch('GET', MAIN_URL + this.cleanUrl(obj.Path), {})
            .then((res) => {
                // the conversion is done in native code
                // the following conversions are done in js, it's SYNC
                console.log('The file saved to ', res.path())
            })
            // Status code is not 200
            .catch((errorMessage, statusCode) => {
                // error handling
                console.log(errorMessage)
            })
    }
    getSoundMap = () => {
        AsyncStorage.getItem('soundMap').then((res) => {
            const soundMap = JSON.parse(res)
            this.setState({
                files: soundMap
            })
        })
    }
    getLocalFiles = (path) => {
        RNFetchBlob.fs.ls(SOUNDS_LOCAL_PATH + path)
            // files will an array contains filenames
            .then((files) => {
                this.setState({
                    files: files
                })
            })
    }
    playSound  = (path) => {
        var s = new Sound(path, SOUNDS_LOCAL_PATH, (e) => {
            if (e) {
                console.log('error', e);
            } else {
                console.log('duration', s.getDuration());
                s.play();
            }
        });
    }
}

var styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    button: {
        fontSize: 20,
        backgroundColor: 'silver',
        padding: 5,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    }
});

export default MainView;
