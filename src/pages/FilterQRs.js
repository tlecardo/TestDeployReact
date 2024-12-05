import { Col, Container, Row } from 'react-bootstrap';

import React, { useContext, useState, useEffect, useMemo } from 'react';
import AppContext from '../context/AppContext';
import { VizUnderline } from '../assets/js/design/underliners/vizUnderline';
import { ArticleUnderline } from '../assets/js/design/underliners/articleUnderline';
import { WaffleChart } from '../assets/js/design/waffleChart';
import * as Order from "../assets/js/types/orders"
import * as d3 from 'd3';

import GlobalStatus from '../assets/js/tools/globalStatus';
import CentralPanel from '../components/threeColumns/CentralPanel';
import LeftPanel from '../components/threeColumns/LeftPanel';
import RightPanel from '../components/threeColumns/RightPanel';

let minIndex = (data) => Math.min(...data.clusters.map(e => e.cluster));
let maxIndex = (data) => Math.max(...data.clusters.map(e => e.cluster));

let color = {
    global: "rgba(0, 0, 255, #)",
    local: "rgba(0, 255, 0, #)",
    select: "rgba(255, 0, 0, #)",
    all: "rgba(0, 0, 255, #)"
}

/**
 * Update question display
 * @param {Object} item - question item
 * @param {WaffleChart} vizObject - waffleChart object
 */
function focusScroll(item) {
    let node = document.querySelector(`[data-question-text="${item.question}"]`)
    if (node) {
        node.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    }
}

function extractSubQuestions(row) {
    if (row.diff_word === null) {
        return [row.question]
    }
    let questions = Array.from({ length: row.diff_word[0][1].length }, () => `${row.question}`.split(" "))

    for (let idx_qst in row.diff_word[0][1]) {
        for (let idx_word in row.diff_word) {
            let nw_word = row.diff_word[idx_word][1][idx_qst]
            questions[idx_qst][row.diff_word[idx_word][0]] = nw_word
        }
    }
    return questions.map(x => x.join(" "))
}

function getAllRows(data) {
    let dict_q = {}
    for (let row of data) {
        if (row.diff_word !== null) {
            let questions = Array.from({ length: row.diff_word[0][1].length }, () => `${row.question}`.split(" "))
            for (let idx_qst in row.diff_word[0][1]) {
                for (let idx_word in row.diff_word) {
                    let nw_word = row.diff_word[idx_word][1][idx_qst]
                    questions[idx_qst][row.diff_word[idx_word][0]] = nw_word
                }
            }
            questions.map(x => x.join(" ")).forEach((subquestion, idx) => dict_q[subquestion] = {
                "cluster": row.cluster,
                "answer": [row.answer[idx]],
                "diff_word": null,
                "src": [row.src[idx]],
                "question": subquestion
            })
        } else {
            dict_q[row.question] = row
        }
    }
    
    return dict_q
}


function FilterQRs() {
    const { api, state } = useContext(AppContext);

    const [globalView, changeView] = useState(0)
    const [selectQuestions, updateList] = useState([])
    const [questionIndex, changeQuestionIndex] = useState(0)
    const [statusR, changeStatusR] = useState(false)
    const [statusG, changeStatusG] = useState(false)

    let min_cluster = minIndex(state.questions)
    let max_cluster = maxIndex(state.questions)
    const [curCluster, changeCurCluster] = useState(min_cluster);

    let local_data = state.questions.clusters.filter(x => x.cluster === curCluster)
    if (curCluster === max_cluster + 1) {
        //local_data = state.questions.clusters.filter(x => selectQuestions.includes(x.question))
        let allR = getAllRows(state.questions.clusters)
        local_data = selectQuestions.map(x => allR[x])
    }

    local_data.sort(Order.alphabetic)

    let curItem = local_data[questionIndex]

    let opts = {
        "nb_questions": local_data.length,
        "min_cluster": min_cluster,
        "max_cluster": max_cluster
    }

    let globalStatus = new GlobalStatus()

    globalStatus.addSelectedQuestionStatus(selectQuestions, updateList)
    globalStatus.addQuestionStatus(questionIndex, changeQuestionIndex, opts)
    globalStatus.addClusterStatus(curCluster, changeCurCluster, opts)
    globalStatus.addViewStatus(globalView, changeView, opts)
    globalStatus.addKey("R", statusR, changeStatusR)
    globalStatus.addKey("G", statusG, changeStatusG)

    let vizClue = new VizUnderline(state.dataParser.data[0].data.length, state.dataParser.type)

    let articleClue = new ArticleUnderline(state.article)
    articleClue.coverage(null, { color: color["all"] })

    let chart = new WaffleChart({ "size": .8, "number": 10, "delta": 1 })
    // eslint-disable-next-line
    useEffect(() => chart.initialize(state.questions, globalStatus, state.language), [])
    chart.updateCurCluster(globalStatus.cluster.value, globalStatus.view.value)
    chart.updateQuestionSelect(state.questions, globalStatus.selectedQuestion.value)

    function updateCues(data, opts) {
        vizClue.coverage(data, opts)
        articleClue.coverage(data, opts)
    }


    d3.select(".selected-bar")
        .on("mouseenter", () => globalStatus.pressKey("R"))
        .on("mouseleave", () => globalStatus.releaseKey("R"))
        .on("click", () => {
            globalStatus.cluster.update(globalStatus.cluster.max + 1);
            globalStatus.view.update(0);
        })

    d3.select("body")
        .on("keyup", input => {
            if (input.key === "r" || input.key === "g") {
                globalStatus.releaseKey("G")
                globalStatus.releaseKey("R")
                chart.resizeSelectedBox({ "ratio": 0 })
                globalStatus.reload()
            }
        })
        .on("keydown", input => {
            switch (input.key) {
                case "=":
                    globalStatus.reload()
                    break;
                case "r":
                    globalStatus.pressKey("R")
                    break;
                case "g":
                    globalStatus.pressKey("G")
                    break;
                case "Enter":
                case " ":
                    if (globalStatus.cluster.value <= globalStatus.cluster.max || globalStatus.selectedQuestion.value.length > 0) {

                        if (globalStatus.view.value === 0) {
                            let questionsClusters = [...state.questions.clusters.filter(e => e.cluster === globalStatus.cluster.value).flatMap(item => extractSubQuestions(item))]
                            globalStatus.changeSelecQ(questionsClusters)
                        } else if (globalStatus.view.value === 1) {
                            let allQuestions = extractSubQuestions(curItem)
                            globalStatus.changeSelecQ(allQuestions)
                        }
                    }

                    if (globalStatus.view.value === 2) {
                        globalStatus.changeView("next")
                    }
                    break;
                case "ArrowDown":
                    globalStatus.changeQuestion("next")
                    globalStatus.releaseKey("R")
                    break;
                case "ArrowUp":
                    globalStatus.changeQuestion("prev")
                    globalStatus.releaseKey("R")
                    break;
                case "ArrowRight":
                    if (!curItem) {
                        globalStatus.changeView("prev")
                    } else if (!(curItem.diff_word === null & globalStatus.view.value === 1)) {
                        globalStatus.changeView("prev")
                    }
                    break;
                case "ArrowLeft":
                    globalStatus.changeView("next")
                    break;
                default:
            }
        })

    console.log(curItem)
    if (globalStatus.specialKey["R"].value) {
        chart.resizeSelectedBox({ ratio: 0.06, color: color["select"] })
        updateCues(state.questions.clusters, { color: color["select"], selectQuestions: globalStatus.selectedQuestion.value })
    } else if (globalStatus.specialKey["G"].value) {
        chart.resizeBox({ ratio: 0.06, color: color["all"] })
        updateCues(state.questions.clusters, { color: color["all"] })
    } else {
        switch (globalStatus.view.value) {
            case 0:
                if (globalStatus.cluster.value === globalStatus.cluster.max + 1) {
                    updateCues(state.questions.clusters, { color: color["select"], selectQuestions: globalStatus.selectedQuestion.value })
                } else {
                    updateCues(local_data, { color: color["global"] })
                }
                break
            case 1:
                if (curItem) {
                    focusScroll(curItem)
                    console.log(curItem)
                    chart.updateCurQuestion(curItem.question)
                    updateCues(curItem, { color: color["local"] })
                    if (globalStatus.cluster.value === globalStatus.cluster.max + 1) {
                        chart.resizeSelectedBox({ ratio: 0.06, color: color["select"] })
                    }
                }
                break
            case 2:
                if (curItem) {
                    focusScroll(curItem)
                    chart.updateCurQuestion(curItem.question)
                }
                break
            default:
        }
    }

    /*
    useMemo(() => {
        vizClue.coverage(rows, { color: color["local"]});
        //console.log(rows)
    }, [rows])
    */
    console.log(globalStatus.selectedQuestion.value)
    return (
        <Container style={{ fontSize: "large", textAlign: "center", overflowY: "clip" }}>
            <Row style={{ marginTop: "1rem" }}>
                <Col xs={2} style={{ borderRight: "0.01rem solid grey", paddingRight: "0px" }}>
                    <LeftPanel
                        color={color}
                        globalStatus={globalStatus}
                    />
                </Col>
                <Col xs={7} style={{ textAlign: "left" }}>
                    <CentralPanel
                        data={local_data}
                        globalStatus={globalStatus}
                    />
                </Col>
                <Col xs={3} style={{ borderLeft: "0.01rem solid grey" }}>
                    <RightPanel
                        globalStatus={globalStatus}
                        color={color}
                        dataviz={vizClue.getOptions()}
                        article={articleClue.HTML}
                    />
                </Col>
            </Row>
        </Container>
    );
}

export default FilterQRs;