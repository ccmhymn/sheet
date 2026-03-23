$(document).ready(function () {

    // ── Bootstrap 5 모달 인스턴스 ──
    var hymnModal = new bootstrap.Modal(document.getElementById('hymnModal'));

    // ── "/" 키 → 전체검색 포커스 ──
    $(document).on('keydown', function (e) {
        if ($('#hymnModal').hasClass('show')) return;
        if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault();
            $('#globalSearch').focus();
        }
    });

    // ── 데이터 로드 ──
    $.ajax({ url: 'hymn-data.json?ver=001' })
        .fail(function () {
            $('#loadError').removeClass('d-none');
        })
        .done(function (data) {

            // ── DataTables 초기화 ──
            var table = $('#myTable').DataTable({
                data: data,
                orderMulti: true,
                processing: true,
                filter: true,
                ordering: true,
                paging: true,
                pageLength: 20,
                orderCellsTop: true,
                order: [[0, 'asc']],

                columns: [
                    { data: 'no',          title: '장'  },
                    { data: 'title',       title: '제목' },
                    { data: 'category',    title: '분류' },
                    { data: 'chord',       title: '코드' },
                    { data: 'beat',        title: '박자' },
                    { data: 'lyrics'       },
                    { data: 'full_lyrics'  },
                    { data: 'img'          },
                    { data: 'midi'         },
                    { data: 'txt'          }
                ],

                columnDefs: [
                    { targets: [0, 1, 2], visible: true,  orderable: true,  searchable: true  },
                    { targets: [3, 4],    visible: false, orderable: true,  searchable: true  },
                    { targets: [5],       visible: false, orderable: false, searchable: true  },
                    { targets: '_all',    visible: false, orderable: false, searchable: false }
                ],

                language: {
                    emptyTable:   '데이터가 없습니다.',
                    info:         '총 _TOTAL_ 곡 중 _START_ - _END_ 표시',
                    infoEmpty:    '표시할 데이터 없음',
                    infoFiltered: '(전체 _MAX_ 곡에서 검색)',
                    loadingRecords: '로딩중...',
                    processing:   '처리중...',
                    search:       '',
                    zeroRecords:  '검색 결과가 없습니다.',
                    paginate: { first: '처음', last: '마지막', next: '다음', previous: '이전' }
                },

                initComplete: function () {
                    // ── tfoot 기반 컬럼별 검색 입력 ──
                    this.api().columns([0, 1, 2, 3, 4]).every(function () {
                        var col = this;
                        var title = $(col.header()).text();
                        $('<input type="text" class="form-control form-control-sm column_search" placeholder="' + title + '">')
                            .appendTo($(col.footer()).empty())
                            .on('keyup change', function () {
                                if (col.search() !== this.value) {
                                    col.search(this.value).draw();
                                }
                            });
                    });

                    // ── 전체검색 연결 ──
                    $('#globalSearch').on('keyup change', function () {
                        table.search(this.value).draw();
                    });

                    // ── 코드/박자 열 토글 ──
                    var _extraVisible = false;
                    $('#toggleExtraCols').on('click', function () {
                        _extraVisible = !_extraVisible;
                        table.column(3).visible(_extraVisible);
                        table.column(4).visible(_extraVisible);
                        table.columns.adjust();
                        $(this)
                            .toggleClass('active', _extraVisible)
                            .html(_extraVisible
                                ? '<i class="bi bi-eye"></i><span class="d-none d-sm-inline"> 코드/박자</span>'
                                : '<i class="bi bi-eye-slash"></i><span class="d-none d-sm-inline"> 코드/박자</span>');
                    });
                }
            }); // DataTable

            // ── 행 클릭 → 모달 오픈 ──
            $('#myTable tbody').off().on('click', 'tr', function () {
                var rowData = table.row(this).data();
                if (!rowData) return;

                // iOS AudioContext unlock (사용자 제스처 내에서)
                var AudioContextFunc = window.AudioContext || window.webkitAudioContext;
                if (AudioContextFunc) {
                    if (typeof audioContext === 'undefined' || audioContext === null || audioContext.state === 'closed') {
                        audioContext = new AudioContextFunc();
                    }
                    audioContext.resume();
                }

                // 선택된 행 강조
                $('#myTable tbody tr').removeClass('active-hymn-row');
                $(this).addClass('active-hymn-row');

                // URL 조합
                var simpleTitle = rowData['title'];
                var imgUrl      = 'asset/hymn/img/'    + rowData['img'];
                var midiUrl     = 'asset/hymn/mid/'    + rowData['midi'];
                var textUrl     = 'asset/hymn/lyrics/' + rowData['txt'];
                var youtubeUrl  = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(simpleTitle);
                var titleStr    = rowData['no'] + '. ' + rowData['title'] +
                                  ' | ' + rowData['category'] +
                                  ' | ' + rowData['chord'] +
                                  ' | ' + rowData['beat'];

                // 모달 내용 설정
                $('#hymnModalTitle').text(titleStr);
                $('#youtubeLink').attr('href', youtubeUrl);
                $('#sheetImg').attr('href', imgUrl);

                // 이미지
                $('#img-error').addClass('d-none');
                $('#preview')
                    .off('error')
                    .on('error', function () {
                        $(this).attr('src', '');
                        $('#img-error').removeClass('d-none');
                    })
                    .attr('src', imgUrl);

                // 가사 로딩
                $('#fullText').html(
                    '<div class="d-flex align-items-center gap-2 text-muted py-2 px-1">' +
                    '<div class="spinner-border spinner-border-sm"></div>' +
                    '<span>가사 로딩중...</span></div>'
                );
                $.get(textUrl, function (txtData) {
                    var escapedText = $('<div>').text(txtData).html();
                    $('#fullText').html(
                        '<div class="d-flex align-items-center justify-content-between mb-1">' +
                          '<span class="badge bg-secondary">가사</span>' +
                          '<button id="copyLyricsBtn" class="btn btn-outline-secondary btn-sm py-0 px-2" style="font-size:0.75rem">' +
                            '<i class="bi bi-clipboard me-1"></i>가사 copy' +
                          '</button>' +
                        '</div>' +
                        '<pre id="lyricsText">' + escapedText + '</pre>'
                    );
                    // 복사 버튼 핸들러
                    $('#copyLyricsBtn').on('click', function () {
                        var text = $('#lyricsText').text();
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                            navigator.clipboard.writeText(text).then(function () {
                                showCopyToast();
                            }).catch(function () {
                                _fallbackCopy(text);
                            });
                        } else {
                            _fallbackCopy(text);
                        }
                    });
                }).fail(function () {
                    $('#fullText').html(
                        '<div class="alert alert-warning py-1 small">' +
                        '<i class="bi bi-info-circle me-1"></i>가사를 불러올 수 없습니다.</div>'
                    );
                });

                // MIDI 로드
                handleExample(midiUrl);

                // 모달 표시
                hymnModal.show();
            });

            // ── 모달 닫힘 이벤트 ──
            document.getElementById('hymnModal').addEventListener('hidden.bs.modal', function () {
                // MIDI 중지
                if (typeof audioContext !== 'undefined' && audioContext !== null &&
                    audioContext.state !== 'closed') {
                    if (typeof player !== 'undefined' && player !== null) {
                        player.cancelQueue(audioContext);
                    }
                    audioContext.suspend();
                }
                // 컨트롤 초기화
                $('#cntls').empty();
                $('#img-error').addClass('d-none');

                // 검색 필터 초기화 (빈 값으로 재트리거)
                $('.column_search').val('');
                table.columns().search('').draw();
            });

            // ── 이미지 오버레이: 터치 2초 표시 ──
            $(document).on('touchstart', '.sheet-img-wrap', function () {
                var $overlay = $(this).find('.sheet-img-overlay');
                $overlay.css('opacity', '1');
                clearTimeout($(this).data('dimmerTimer'));
                $(this).data('dimmerTimer', setTimeout(function () {
                    $overlay.css('opacity', '');
                }, 2000));
            });

        }); // .done

}); // document.ready


// ── 가사 복사 토스트 ──
function showCopyToast() {
    var $toast = $('#copyToast');
    $toast.stop(true, true).css({ opacity: 1, bottom: '2rem' }).fadeIn(150);
    setTimeout(function () {
        $toast.animate({ opacity: 0, bottom: '1.2rem' }, 400, function () {
            $(this).hide().css('bottom', '2rem');
        });
    }, 1800);
}

function _fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showCopyToast(); } catch (e) {}
    document.body.removeChild(ta);
}

// ── 언어팩 (영문 - 미사용이지만 보존) ──
var lang_eng = {
    emptyTable: 'No data available',
    info: 'Showing _START_ to _END_ of _TOTAL_ entries',
    infoEmpty: 'Showing 0 to 0 of 0 entries',
    infoFiltered: '(filtered from _MAX_ total entries)',
    search: 'Search:',
    zeroRecords: 'No matching records found',
    paginate: { first: 'First', last: 'Last', next: 'Next', previous: 'Previous' }
};
