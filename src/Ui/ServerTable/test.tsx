import React from 'react';
import styles from './test.module.css';
import type { NS } from '@ns';

export async function main(ns: NS){
    ns.printRaw(
        <div className={styles.container}>
            <h1 className={styles.title}>Hello CSS Modules</h1>
            <button className={styles.button}>点击我</button>
        </div>
    )
    return new Promise(() => {})
}
