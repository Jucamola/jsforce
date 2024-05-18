"use strict";

var _interopRequireDefault = require("@babel/runtime-corejs3/helpers/interopRequireDefault");
var _Object$defineProperty = require("@babel/runtime-corejs3/core-js-stable/object/define-property");
var _Object$defineProperties = require("@babel/runtime-corejs3/core-js-stable/object/define-properties");
var _Object$getOwnPropertyDescriptors = require("@babel/runtime-corejs3/core-js-stable/object/get-own-property-descriptors");
var _forEachInstanceProperty = require("@babel/runtime-corejs3/core-js-stable/instance/for-each");
var _Object$getOwnPropertyDescriptor = require("@babel/runtime-corejs3/core-js-stable/object/get-own-property-descriptor");
var _filterInstanceProperty = require("@babel/runtime-corejs3/core-js-stable/instance/filter");
var _Object$getOwnPropertySymbols = require("@babel/runtime-corejs3/core-js-stable/object/get-own-property-symbols");
var _Object$keys2 = require("@babel/runtime-corejs3/core-js-stable/object/keys");
require("core-js/modules/es.array.iterator");
require("core-js/modules/es.promise");
require("core-js/modules/es.string.replace");
_Object$defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.IngestJobV2 = exports.QueryJobV2 = exports.BulkV2 = exports.Bulk = exports.Batch = exports.Job = void 0;
var _weakMap = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/weak-map"));
var _concat = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/instance/concat"));
var _now = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/date/now"));
var _stringify = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/json/stringify"));
var _classPrivateFieldGet3 = _interopRequireDefault(require("@babel/runtime-corejs3/helpers/classPrivateFieldGet"));
var _classPrivateFieldSet2 = _interopRequireDefault(require("@babel/runtime-corejs3/helpers/classPrivateFieldSet"));
var _map = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/instance/map"));
var _setTimeout2 = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/set-timeout"));
var _parseInt2 = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/parse-int"));
var _keys = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/object/keys"));
var _objectWithoutProperties2 = _interopRequireDefault(require("@babel/runtime-corejs3/helpers/objectWithoutProperties"));
var _isArray = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/array/is-array"));
var _promise = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/promise"));
var _trim = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/instance/trim"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime-corejs3/helpers/defineProperty"));
var _events = require("events");
var _stream = require("stream");
var _multistream = _interopRequireDefault(require("multistream"));
var _recordStream = require("../record-stream");
var _httpApi = _interopRequireDefault(require("../http-api"));
var _jsforce = require("../jsforce");
var _stream2 = require("../util/stream");
var _function = require("../util/function");
function ownKeys(object, enumerableOnly) { var keys = _Object$keys2(object); if (_Object$getOwnPropertySymbols) { var symbols = _Object$getOwnPropertySymbols(object); if (enumerableOnly) symbols = _filterInstanceProperty(symbols).call(symbols, function (sym) { return _Object$getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { var _context5; _forEachInstanceProperty(_context5 = ownKeys(Object(source), true)).call(_context5, function (key) { (0, _defineProperty2.default)(target, key, source[key]); }); } else if (_Object$getOwnPropertyDescriptors) { _Object$defineProperties(target, _Object$getOwnPropertyDescriptors(source)); } else { var _context6; _forEachInstanceProperty(_context6 = ownKeys(Object(source))).call(_context6, function (key) { _Object$defineProperty(target, key, _Object$getOwnPropertyDescriptor(source, key)); }); } } return target; } /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     * @file Manages Salesforce Bulk API related operations
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     * @author Shinichi Tomita <shinichi.tomita@gmail.com>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     */
/*--------------------------------------------*/

/**
 * Class for Bulk API Job
 */
class Job extends _events.EventEmitter {
  /**
   *
   */
  constructor(bulk, type, operation, options, jobId) {
    super();
    (0, _defineProperty2.default)(this, "type", void 0);
    (0, _defineProperty2.default)(this, "operation", void 0);
    (0, _defineProperty2.default)(this, "options", void 0);
    (0, _defineProperty2.default)(this, "id", void 0);
    (0, _defineProperty2.default)(this, "state", void 0);
    (0, _defineProperty2.default)(this, "_bulk", void 0);
    (0, _defineProperty2.default)(this, "_batches", void 0);
    (0, _defineProperty2.default)(this, "_jobInfo", void 0);
    (0, _defineProperty2.default)(this, "_error", void 0);
    this._bulk = bulk;
    this.type = type;
    this.operation = operation;
    this.options = options || {};
    this.id = jobId !== null && jobId !== void 0 ? jobId : null;
    this.state = this.id ? 'Open' : 'Unknown';
    this._batches = {};
    // default error handler to keep the latest error
    this.on('error', error => this._error = error);
  }

  /**
   * Return latest jobInfo from cache
   */
  info() {
    // if cache is not available, check the latest
    if (!this._jobInfo) {
      this._jobInfo = this.check();
    }
    return this._jobInfo;
  }

  /**
   * Open new job and get jobinfo
   */
  open() {
    const bulk = this._bulk;
    const options = this.options;

    // if sobject type / operation is not provided
    if (!this.type || !this.operation) {
      throw new Error('type / operation is required to open a new job');
    }

    // if not requested opening job
    if (!this._jobInfo) {
      var _context;
      let operation = this.operation.toLowerCase();
      if (operation === 'harddelete') {
        operation = 'hardDelete';
      }
      if (operation === 'queryall') {
        operation = 'queryAll';
      }
      const body = (0, _trim.default)(_context = `
<?xml version="1.0" encoding="UTF-8"?>
<jobInfo  xmlns="http://www.force.com/2009/06/asyncapi/dataload">
  <operation>${operation}</operation>
  <object>${this.type}</object>
  ${options.extIdField ? `<externalIdFieldName>${options.extIdField}</externalIdFieldName>` : ''}
  ${options.concurrencyMode ? `<concurrencyMode>${options.concurrencyMode}</concurrencyMode>` : ''}
  ${options.assignmentRuleId ? `<assignmentRuleId>${options.assignmentRuleId}</assignmentRuleId>` : ''}
  <contentType>CSV</contentType>
</jobInfo>
      `).call(_context);
      this._jobInfo = (async () => {
        try {
          const res = await bulk._request({
            method: 'POST',
            path: '/job',
            body,
            headers: {
              'Content-Type': 'application/xml; charset=utf-8'
            },
            responseType: 'application/xml'
          });
          this.emit('open', res.jobInfo);
          this.id = res.jobInfo.id;
          this.state = res.jobInfo.state;
          return res.jobInfo;
        } catch (err) {
          this.emit('error', err);
          throw err;
        }
      })();
    }
    return this._jobInfo;
  }

  /**
   * Create a new batch instance in the job
   */
  createBatch() {
    const batch = new Batch(this);
    batch.on('queue', () => {
      this._batches[batch.id] = batch;
    });
    return batch;
  }

  /**
   * Get a batch instance specified by given batch ID
   */
  batch(batchId) {
    let batch = this._batches[batchId];
    if (!batch) {
      batch = new Batch(this, batchId);
      this._batches[batchId] = batch;
    }
    return batch;
  }

  /**
   * Check the latest job status from server
   */
  check() {
    const bulk = this._bulk;
    const logger = bulk._logger;
    this._jobInfo = (async () => {
      const jobId = await this.ready();
      const res = await bulk._request({
        method: 'GET',
        path: '/job/' + jobId,
        responseType: 'application/xml'
      });
      logger.debug(res.jobInfo);
      this.id = res.jobInfo.id;
      this.type = res.jobInfo.object;
      this.operation = res.jobInfo.operation;
      this.state = res.jobInfo.state;
      return res.jobInfo;
    })();
    return this._jobInfo;
  }

  /**
   * Wait till the job is assigned to server
   */
  ready() {
    return this.id ? _promise.default.resolve(this.id) : this.open().then(({
      id
    }) => id);
  }

  /**
   * List all registered batch info in job
   */
  async list() {
    const bulk = this._bulk;
    const logger = bulk._logger;
    const jobId = await this.ready();
    const res = await bulk._request({
      method: 'GET',
      path: '/job/' + jobId + '/batch',
      responseType: 'application/xml'
    });
    logger.debug(res.batchInfoList.batchInfo);
    const batchInfoList = (0, _isArray.default)(res.batchInfoList.batchInfo) ? res.batchInfoList.batchInfo : [res.batchInfoList.batchInfo];
    return batchInfoList;
  }

  /**
   * Close opened job
   */
  async close() {
    if (!this.id) {
      return;
    }
    try {
      const jobInfo = await this._changeState('Closed');
      this.id = null;
      this.emit('close', jobInfo);
      return jobInfo;
    } catch (err) {
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Set the status to abort
   */
  async abort() {
    if (!this.id) {
      return;
    }
    try {
      const jobInfo = await this._changeState('Aborted');
      this.id = null;
      this.emit('abort', jobInfo);
      return jobInfo;
    } catch (err) {
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * @private
   */
  async _changeState(state) {
    const bulk = this._bulk;
    const logger = bulk._logger;
    this._jobInfo = (async () => {
      var _context2;
      const jobId = await this.ready();
      const body = (0, _trim.default)(_context2 = ` 
<?xml version="1.0" encoding="UTF-8"?>
  <jobInfo xmlns="http://www.force.com/2009/06/asyncapi/dataload">
  <state>${state}</state>
</jobInfo>
      `).call(_context2);
      const res = await bulk._request({
        method: 'POST',
        path: '/job/' + jobId,
        body: body,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8'
        },
        responseType: 'application/xml'
      });
      logger.debug(res.jobInfo);
      this.state = res.jobInfo.state;
      return res.jobInfo;
    })();
    return this._jobInfo;
  }
}

/*--------------------------------------------*/
exports.Job = Job;
class PollingTimeoutError extends Error {
  /**
   *
   */
  constructor(message, jobId, batchId) {
    super(message);
    (0, _defineProperty2.default)(this, "jobId", void 0);
    (0, _defineProperty2.default)(this, "batchId", void 0);
    this.name = 'PollingTimeout';
    this.jobId = jobId;
    this.batchId = batchId;
  }
}
class JobPollingTimeoutError extends Error {
  /**
   *
   */
  constructor(message, jobId) {
    super(message);
    (0, _defineProperty2.default)(this, "jobId", void 0);
    this.name = 'JobPollingTimeout';
    this.jobId = jobId;
  }
}

/*--------------------------------------------*/
/**
 * Batch (extends Writable)
 */
class Batch extends _stream.Writable {
  /**
   *
   */
  constructor(job, id) {
    super({
      objectMode: true
    });
    (0, _defineProperty2.default)(this, "job", void 0);
    (0, _defineProperty2.default)(this, "id", void 0);
    (0, _defineProperty2.default)(this, "_bulk", void 0);
    (0, _defineProperty2.default)(this, "_uploadStream", void 0);
    (0, _defineProperty2.default)(this, "_downloadStream", void 0);
    (0, _defineProperty2.default)(this, "_dataStream", void 0);
    (0, _defineProperty2.default)(this, "_result", void 0);
    (0, _defineProperty2.default)(this, "_error", void 0);
    (0, _defineProperty2.default)(this, "run", this.execute);
    (0, _defineProperty2.default)(this, "exec", this.execute);
    this.job = job;
    this.id = id;
    this._bulk = job._bulk;

    // default error handler to keep the latest error
    this.on('error', error => this._error = error);

    //
    // setup data streams
    //
    const converterOptions = {
      nullValue: '#N/A'
    };
    const uploadStream = this._uploadStream = new _recordStream.Serializable();
    const uploadDataStream = uploadStream.stream('csv', converterOptions);
    const downloadStream = this._downloadStream = new _recordStream.Parsable();
    const downloadDataStream = downloadStream.stream('csv', converterOptions);
    this.on('finish', () => uploadStream.end());
    uploadDataStream.once('readable', async () => {
      try {
        // ensure the job is opened in server or job id is already assigned
        await this.job.ready();
        // pipe upload data to batch API request stream
        uploadDataStream.pipe(this._createRequestStream());
      } catch (err) {
        this.emit('error', err);
      }
    });

    // duplex data stream, opened access to API programmers by Batch#stream()
    this._dataStream = (0, _stream2.concatStreamsAsDuplex)(uploadDataStream, downloadDataStream);
  }

  /**
   * Connect batch API and create stream instance of request/response
   *
   * @private
   */
  _createRequestStream() {
    const bulk = this._bulk;
    const logger = bulk._logger;
    const req = bulk._request({
      method: 'POST',
      path: '/job/' + this.job.id + '/batch',
      headers: {
        'Content-Type': 'text/csv'
      },
      responseType: 'application/xml'
    });
    (async () => {
      try {
        const res = await req;
        logger.debug(res.batchInfo);
        this.id = res.batchInfo.id;
        this.emit('queue', res.batchInfo);
      } catch (err) {
        this.emit('error', err);
      }
    })();
    return req.stream();
  }

  /**
   * Implementation of Writable
   */
  _write(record_, enc, cb) {
    const {
        Id,
        type,
        attributes
      } = record_,
      rrec = (0, _objectWithoutProperties2.default)(record_, ["Id", "type", "attributes"]);
    let record;
    switch (this.job.operation) {
      case 'insert':
        record = rrec;
        break;
      case 'delete':
      case 'hardDelete':
        record = {
          Id
        };
        break;
      default:
        record = _objectSpread({
          Id
        }, rrec);
    }
    this._uploadStream.write(record, enc, cb);
  }

  /**
   * Returns duplex stream which accepts CSV data input and batch result output
   */
  stream() {
    return this._dataStream;
  }

  /**
   * Execute batch operation
   */
  execute(input) {
    // if batch is already executed
    if (this._result) {
      throw new Error('Batch already executed.');
    }
    this._result = new _promise.default((resolve, reject) => {
      this.once('response', resolve);
      this.once('error', reject);
    });
    if ((0, _function.isObject)(input) && 'pipe' in input && (0, _function.isFunction)(input.pipe)) {
      // if input has stream.Readable interface
      input.pipe(this._dataStream);
    } else {
      if ((0, _isArray.default)(input)) {
        for (const record of input) {
          for (const key of (0, _keys.default)(record)) {
            if (typeof record[key] === 'boolean') {
              record[key] = String(record[key]);
            }
          }
          this.write(record);
        }
        this.end();
      } else if (typeof input === 'string') {
        this._dataStream.write(input, 'utf8');
        this._dataStream.end();
      }
    }

    // return Batch instance for chaining
    return this;
  }
  /**
   * Promise/A+ interface
   * Delegate to promise, return promise instance for batch result
   */
  then(onResolved, onReject) {
    if (!this._result) {
      this.execute();
    }
    return this._result.then(onResolved, onReject);
  }

  /**
   * Check the latest batch status in server
   */
  async check() {
    const bulk = this._bulk;
    const logger = bulk._logger;
    const jobId = this.job.id;
    const batchId = this.id;
    if (!jobId || !batchId) {
      throw new Error('Batch not started.');
    }
    const res = await bulk._request({
      method: 'GET',
      path: '/job/' + jobId + '/batch/' + batchId,
      responseType: 'application/xml'
    });
    logger.debug(res.batchInfo);
    return res.batchInfo;
  }

  /**
   * Polling the batch result and retrieve
   */
  poll(interval, timeout) {
    const jobId = this.job.id;
    const batchId = this.id;
    if (!jobId || !batchId) {
      throw new Error('Batch not started.');
    }
    const startTime = new Date().getTime();
    const poll = async () => {
      const now = new Date().getTime();
      if (startTime + timeout < now) {
        const err = new PollingTimeoutError('Polling time out. Job Id = ' + jobId + ' , batch Id = ' + batchId, jobId, batchId);
        this.emit('error', err);
        return;
      }
      let res;
      try {
        res = await this.check();
      } catch (err) {
        this.emit('error', err);
        return;
      }
      if (res.state === 'Failed') {
        if ((0, _parseInt2.default)(res.numberRecordsProcessed, 10) > 0) {
          this.retrieve();
        } else {
          this.emit('error', new Error(res.stateMessage));
        }
      } else if (res.state === 'Completed') {
        this.retrieve();
      } else {
        this.emit('progress', res);
        (0, _setTimeout2.default)(poll, interval);
      }
    };
    (0, _setTimeout2.default)(poll, interval);
  }

  /**
   * Retrieve batch result
   */
  async retrieve() {
    const bulk = this._bulk;
    const jobId = this.job.id;
    const job = this.job;
    const batchId = this.id;
    if (!jobId || !batchId) {
      throw new Error('Batch not started.');
    }
    try {
      const resp = await bulk._request({
        method: 'GET',
        path: '/job/' + jobId + '/batch/' + batchId + '/result'
      });
      let results;
      if (job.operation === 'query' || job.operation === 'queryAll') {
        var _context3;
        const res = resp;
        let resultId = res['result-list'].result;
        results = (0, _map.default)(_context3 = (0, _isArray.default)(resultId) ? resultId : [resultId]).call(_context3, id => ({
          id,
          batchId,
          jobId
        }));
      } else {
        const res = resp;
        results = (0, _map.default)(res).call(res, ret => ({
          id: ret.Id || null,
          success: ret.Success === 'true',
          errors: ret.Error ? [ret.Error] : []
        }));
      }
      this.emit('response', results);
      return results;
    } catch (err) {
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Fetch query result as a record stream
   * @param {String} resultId - Result id
   * @returns {RecordStream} - Record stream, convertible to CSV data stream
   */
  result(resultId) {
    const jobId = this.job.id;
    const batchId = this.id;
    if (!jobId || !batchId) {
      throw new Error('Batch not started.');
    }
    const resultStream = new _recordStream.Parsable();
    const resultDataStream = resultStream.stream('csv');
    this._bulk._request({
      method: 'GET',
      path: '/job/' + jobId + '/batch/' + batchId + '/result/' + resultId,
      responseType: 'application/octet-stream'
    }).stream().pipe(resultDataStream);
    return resultStream;
  }
}

/*--------------------------------------------*/
/**
 *
 */
exports.Batch = Batch;
class BulkApi extends _httpApi.default {
  beforeSend(request) {
    var _this$_conn$accessTok;
    request.headers = _objectSpread(_objectSpread({}, request.headers), {}, {
      'X-SFDC-SESSION': (_this$_conn$accessTok = this._conn.accessToken) !== null && _this$_conn$accessTok !== void 0 ? _this$_conn$accessTok : ''
    });
  }
  isSessionExpired(response) {
    return response.statusCode === 400 && /<exceptionCode>InvalidSessionId<\/exceptionCode>/.test(response.body);
  }
  hasErrorInResponseBody(body) {
    return !!body.error;
  }
  parseError(body) {
    return {
      errorCode: body.error.exceptionCode,
      message: body.error.exceptionMessage
    };
  }
}
class BulkApiV2 extends _httpApi.default {
  hasErrorInResponseBody(body) {
    return (0, _isArray.default)(body) && typeof body[0] === 'object' && 'errorCode' in body[0];
  }
  isSessionExpired(response) {
    return response.statusCode === 401 && /INVALID_SESSION_ID/.test(response.body);
  }
  parseError(body) {
    return {
      errorCode: body[0].errorCode,
      message: body[0].message
    };
  }
}

/*--------------------------------------------*/

/**
 * Class for Bulk API
 *
 * @class
 */
class Bulk {
  /**
   * Polling interval in milliseconds
   */

  /**
   * Polling timeout in milliseconds
   * @type {Number}
   */

  /**
   *
   */
  constructor(conn) {
    (0, _defineProperty2.default)(this, "_conn", void 0);
    (0, _defineProperty2.default)(this, "_logger", void 0);
    (0, _defineProperty2.default)(this, "pollInterval", 1000);
    (0, _defineProperty2.default)(this, "pollTimeout", 10000);
    this._conn = conn;
    this._logger = conn._logger;
  }

  /**
   *
   */
  _request(request_) {
    const conn = this._conn;
    const {
        path,
        responseType
      } = request_,
      rreq = (0, _objectWithoutProperties2.default)(request_, ["path", "responseType"]);
    const baseUrl = [conn.instanceUrl, 'services/async', conn.version].join('/');
    const request = _objectSpread(_objectSpread({}, rreq), {}, {
      url: baseUrl + path
    });
    return new BulkApi(this._conn, {
      responseType
    }).request(request);
  }

  /**
   * Create and start bulkload job and batch
   */

  load(type, operation, optionsOrInput, input) {
    let options = {};
    if (typeof optionsOrInput === 'string' || (0, _isArray.default)(optionsOrInput) || (0, _function.isObject)(optionsOrInput) && 'pipe' in optionsOrInput && typeof optionsOrInput.pipe === 'function') {
      // when options is not plain hash object, it is omitted
      input = optionsOrInput;
    } else {
      options = optionsOrInput;
    }
    const job = this.createJob(type, operation, options);
    const batch = job.createBatch();
    const cleanup = () => job.close();
    const cleanupOnError = err => {
      if (err.name !== 'PollingTimeout') {
        cleanup();
      }
    };
    batch.on('response', cleanup);
    batch.on('error', cleanupOnError);
    batch.on('queue', () => {
      batch === null || batch === void 0 ? void 0 : batch.poll(this.pollInterval, this.pollTimeout);
    });
    return batch.execute(input);
  }

  /**
   * Execute bulk query and get record stream
   */
  query(soql) {
    const m = soql.replace(/\([\s\S]+\)/g, '').match(/FROM\s+(\w+)/i);
    if (!m) {
      throw new Error('No sobject type found in query, maybe caused by invalid SOQL.');
    }
    const type = m[1];
    const recordStream = new _recordStream.Parsable();
    const dataStream = recordStream.stream('csv');
    (async () => {
      try {
        const results = await this.load(type, 'query', soql);
        const streams = (0, _map.default)(results).call(results, result => this.job(result.jobId).batch(result.batchId).result(result.id).stream());
        (0, _multistream.default)(streams).pipe(dataStream);
      } catch (err) {
        recordStream.emit('error', err);
      }
    })();
    return recordStream;
  }

  /**
   * Create a new job instance
   */
  createJob(type, operation, options = {}) {
    return new Job(this, type, operation, options);
  }

  /**
   * Get a job instance specified by given job ID
   *
   * @param {String} jobId - Job ID
   * @returns {Bulk~Job}
   */
  job(jobId) {
    return new Job(this, null, null, null, jobId);
  }
}
exports.Bulk = Bulk;
var _connection = new _weakMap.default();
class BulkV2 {
  /**
   * Polling interval in milliseconds
   */

  /**
   * Polling timeout in milliseconds
   * @type {Number}
   */

  constructor(connection) {
    _connection.set(this, {
      writable: true,
      value: void 0
    });
    (0, _defineProperty2.default)(this, "pollInterval", 1000);
    (0, _defineProperty2.default)(this, "pollTimeout", 10000);
    (0, _classPrivateFieldSet2.default)(this, _connection, connection);
  }

  /**
   * Create an instance of an ingest job object.
   *
   * @params {NewIngestJobOptions} options object
   * @returns {IngestJobV2} An ingest job instance
   * @example
   * // Upsert records to the Account object.
   *
   * const job = connection.bulk2.createJob({
   *   operation: 'insert'
   *   object: 'Account',
   * });
   *
   * // create the job in the org
   * await job.open()
   *
   * // upload data
   * await job.uploadData(csvFile)
   *
   * // finished uploading data, mark it as ready for processing
   * await job.close()
   */
  createJob(options) {
    return new IngestJobV2({
      connection: (0, _classPrivateFieldGet3.default)(this, _connection),
      jobInfo: options,
      pollingOptions: this
    });
  }

  /**
   * Get a ingest job instance specified by a given job ID
   *
   * @param options Options object with a job ID
   * @returns IngestJobV2 An ingest job
   */
  job(options) {
    return new IngestJobV2({
      connection: (0, _classPrivateFieldGet3.default)(this, _connection),
      jobInfo: options,
      pollingOptions: this
    });
  }

  /**
   * Create, upload, and start bulkload job
   */
  async loadAndWaitForResults(options) {
    if (!options.pollTimeout) options.pollTimeout = this.pollTimeout;
    if (!options.pollInterval) options.pollInterval = this.pollInterval;
    const job = this.createJob(options);
    try {
      await job.open();
      await job.uploadData(options.input);
      await job.close();
      await job.poll(options.pollInterval, options.pollTimeout);
      return await job.getAllResults();
    } catch (err) {
      if (err.name !== 'JobPollingTimeoutError') {
        // fires off one last attempt to clean up and ignores the result | error
        job.delete().catch(ignored => ignored);
      }
      throw err;
    }
  }

  /**
   * Execute bulk query and get records
   *
   * Default timeout: 10000ms
   *
   * @param soql SOQL query
   * @param BulkV2PollingOptions options object
   *
   * @returns Record[]
   */
  async query(soql, options) {
    const queryJob = new QueryJobV2({
      connection: (0, _classPrivateFieldGet3.default)(this, _connection),
      operation: options !== null && options !== void 0 && options.scanAll ? 'queryAll' : 'query',
      query: soql,
      pollingOptions: this,
      tooling: (options === null || options === void 0 ? void 0 : options.tooling) || false
    });
    try {
      await queryJob.open();
      await queryJob.poll(options === null || options === void 0 ? void 0 : options.pollInterval, options === null || options === void 0 ? void 0 : options.pollTimeout);
      return await queryJob.getResults();
    } catch (err) {
      if (err.name !== 'JobPollingTimeoutError') {
        // fires off one last attempt to clean up and ignores the result | error
        queryJob.delete().catch(ignored => ignored);
      }
      throw err;
    }
  }
}
exports.BulkV2 = BulkV2;
var _connection2 = new _weakMap.default();
var _operation = new _weakMap.default();
var _query = new _weakMap.default();
var _pollingOptions = new _weakMap.default();
var _tooling = new _weakMap.default();
var _queryResults = new _weakMap.default();
var _error = new _weakMap.default();
class QueryJobV2 extends _events.EventEmitter {
  constructor(options) {
    super();
    _connection2.set(this, {
      writable: true,
      value: void 0
    });
    _operation.set(this, {
      writable: true,
      value: void 0
    });
    _query.set(this, {
      writable: true,
      value: void 0
    });
    _pollingOptions.set(this, {
      writable: true,
      value: void 0
    });
    _tooling.set(this, {
      writable: true,
      value: void 0
    });
    _queryResults.set(this, {
      writable: true,
      value: void 0
    });
    _error.set(this, {
      writable: true,
      value: void 0
    });
    (0, _defineProperty2.default)(this, "jobInfo", void 0);
    (0, _defineProperty2.default)(this, "locator", void 0);
    (0, _defineProperty2.default)(this, "finished", false);
    (0, _classPrivateFieldSet2.default)(this, _connection2, options.connection);
    (0, _classPrivateFieldSet2.default)(this, _operation, options.operation);
    (0, _classPrivateFieldSet2.default)(this, _query, options.query);
    (0, _classPrivateFieldSet2.default)(this, _pollingOptions, options.pollingOptions);
    (0, _classPrivateFieldSet2.default)(this, _tooling, options.tooling);
    // default error handler to keep the latest error
    this.on('error', error => (0, _classPrivateFieldSet2.default)(this, _error, error));
  }

  /**
   * Creates a query job
   */
  async open() {
    try {
      this.jobInfo = await this.createQueryRequest({
        method: 'POST',
        path: '',
        body: (0, _stringify.default)({
          operation: (0, _classPrivateFieldGet3.default)(this, _operation),
          query: (0, _classPrivateFieldGet3.default)(this, _query)
        }),
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        responseType: 'application/json'
      });
      this.emit('open');
    } catch (err) {
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Set the status to abort
   */
  async abort() {
    try {
      var _this$jobInfo;
      const state = 'Aborted';
      this.jobInfo = await this.createQueryRequest({
        method: 'PATCH',
        path: `/${(_this$jobInfo = this.jobInfo) === null || _this$jobInfo === void 0 ? void 0 : _this$jobInfo.id}`,
        body: (0, _stringify.default)({
          state
        }),
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        responseType: 'application/json'
      });
      this.emit('aborted');
    } catch (err) {
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Poll for the state of the processing for the job.
   *
   * This method will only throw after a timeout. To capture a
   * job failure while polling you must set a listener for the
   * `failed` event before calling it:
   *
   * job.on('failed', (err) => console.error(err))
   * await job.poll()
   *
   * @param interval Polling interval in milliseconds
   * @param timeout Polling timeout in milliseconds
   * @returns {Promise<Record[]>} A promise that resolves to an array of records
   */
  async poll(interval = (0, _classPrivateFieldGet3.default)(this, _pollingOptions).pollInterval, timeout = (0, _classPrivateFieldGet3.default)(this, _pollingOptions).pollTimeout) {
    const jobId = getJobIdOrError(this.jobInfo);
    const startTime = (0, _now.default)();
    while (startTime + timeout > (0, _now.default)()) {
      try {
        const res = await this.check();
        switch (res.state) {
          case 'Open':
            throw new Error('Job has not been started');
          case 'Aborted':
            throw new Error('Job has been aborted');
          case 'UploadComplete':
          case 'InProgress':
            await delay(interval);
            break;
          case 'Failed':
            // unlike ingest jobs, the API doesn't return an error msg:
            // https://developer.salesforce.com/docs/atlas.en-us.api_asynch.meta/api_asynch/query_get_one_job.htm
            this.emit('failed', new Error('Query job failed to complete.'));
            return;
          case 'JobComplete':
            this.emit('jobcomplete');
            return;
        }
      } catch (err) {
        this.emit('error', err);
        throw err;
      }
    }
    const timeoutError = new JobPollingTimeoutError(`Polling timed out after ${timeout}ms. Job Id = ${jobId}`, jobId);
    this.emit('error', timeoutError);
    throw timeoutError;
  }

  /**
   * Check the latest batch status in server
   */
  async check() {
    try {
      const jobInfo = await this.createQueryRequest({
        method: 'GET',
        path: `/${getJobIdOrError(this.jobInfo)}`,
        responseType: 'application/json'
      });
      this.jobInfo = jobInfo;
      return jobInfo;
    } catch (err) {
      this.emit('error', err);
      throw err;
    }
  }
  request(request, options = {}) {
    // if request is simple string, regard it as url in GET method
    let request_ = typeof request === 'string' ? {
      method: 'GET',
      url: request
    } : request;
    const httpApi = new _httpApi.default((0, _classPrivateFieldGet3.default)(this, _connection2), options);
    httpApi.on('response', response => {
      this.locator = response.headers['sforce-locator'];
    });
    return httpApi.request(request_);
  }
  getResultsUrl() {
    const url = `${(0, _classPrivateFieldGet3.default)(this, _connection2).instanceUrl}/services/data/v${(0, _classPrivateFieldGet3.default)(this, _connection2).version}${(0, _classPrivateFieldGet3.default)(this, _tooling) ? '/tooling' : ''}/jobs/query/${getJobIdOrError(this.jobInfo)}/results`;
    return this.locator ? `${url}?locator=${this.locator}` : url;
  }

  /**
   * Get the results for a query job.
   *
   * @returns {Promise<Record[]>} A promise that resolves to an array of records
   */
  async getResults() {
    if (this.finished && (0, _classPrivateFieldGet3.default)(this, _queryResults)) {
      return (0, _classPrivateFieldGet3.default)(this, _queryResults);
    }
    (0, _classPrivateFieldSet2.default)(this, _queryResults, []);
    while (this.locator !== 'null') {
      var _context4;
      const nextResults = await this.request({
        method: 'GET',
        url: this.getResultsUrl(),
        headers: {
          Accept: 'text/csv'
        }
      });
      (0, _classPrivateFieldSet2.default)(this, _queryResults, (0, _concat.default)(_context4 = (0, _classPrivateFieldGet3.default)(this, _queryResults)).call(_context4, nextResults));
    }
    this.finished = true;
    return (0, _classPrivateFieldGet3.default)(this, _queryResults);
  }

  /**
   * Deletes a query job.
   */
  async delete() {
    return this.createQueryRequest({
      method: 'DELETE',
      path: `/${getJobIdOrError(this.jobInfo)}`
    });
  }
  createQueryRequest(request) {
    const {
      path,
      responseType
    } = request;
    const baseUrl = [(0, _classPrivateFieldGet3.default)(this, _connection2).instanceUrl, 'services/data', `v${(0, _classPrivateFieldGet3.default)(this, _connection2).version}`, ...((0, _classPrivateFieldGet3.default)(this, _tooling) ? ['tooling'] : []), 'jobs/query'].join('/');
    return new BulkApiV2((0, _classPrivateFieldGet3.default)(this, _connection2), {
      responseType
    }).request(_objectSpread(_objectSpread({}, request), {}, {
      url: baseUrl + path
    }));
  }
}

/**
 * Class for Bulk API V2 Ingest Job
 */
exports.QueryJobV2 = QueryJobV2;
var _connection3 = new _weakMap.default();
var _pollingOptions2 = new _weakMap.default();
var _jobData = new _weakMap.default();
var _bulkJobSuccessfulResults = new _weakMap.default();
var _bulkJobFailedResults = new _weakMap.default();
var _bulkJobUnprocessedRecords = new _weakMap.default();
var _error2 = new _weakMap.default();
class IngestJobV2 extends _events.EventEmitter {
  /**
   *
   */
  constructor(options) {
    super();
    _connection3.set(this, {
      writable: true,
      value: void 0
    });
    _pollingOptions2.set(this, {
      writable: true,
      value: void 0
    });
    _jobData.set(this, {
      writable: true,
      value: void 0
    });
    _bulkJobSuccessfulResults.set(this, {
      writable: true,
      value: void 0
    });
    _bulkJobFailedResults.set(this, {
      writable: true,
      value: void 0
    });
    _bulkJobUnprocessedRecords.set(this, {
      writable: true,
      value: void 0
    });
    _error2.set(this, {
      writable: true,
      value: void 0
    });
    (0, _defineProperty2.default)(this, "jobInfo", void 0);
    (0, _classPrivateFieldSet2.default)(this, _connection3, options.connection);
    (0, _classPrivateFieldSet2.default)(this, _pollingOptions2, options.pollingOptions);
    this.jobInfo = options.jobInfo;
    (0, _classPrivateFieldSet2.default)(this, _jobData, new JobDataV2({
      createRequest: request => this.createIngestRequest(request),
      job: this
    }));
    // default error handler to keep the latest error
    this.on('error', error => (0, _classPrivateFieldSet2.default)(this, _error2, error));
  }
  get id() {
    return this.jobInfo.id;
  }

  /**
   * Create a job representing a bulk operation in the org
   */
  async open() {
    try {
      var _this$jobInfo2, _this$jobInfo3, _this$jobInfo4, _this$jobInfo5, _this$jobInfo6;
      this.jobInfo = await this.createIngestRequest({
        method: 'POST',
        path: '',
        body: (0, _stringify.default)({
          assignmentRuleId: (_this$jobInfo2 = this.jobInfo) === null || _this$jobInfo2 === void 0 ? void 0 : _this$jobInfo2.assignmentRuleId,
          externalIdFieldName: (_this$jobInfo3 = this.jobInfo) === null || _this$jobInfo3 === void 0 ? void 0 : _this$jobInfo3.externalIdFieldName,
          object: (_this$jobInfo4 = this.jobInfo) === null || _this$jobInfo4 === void 0 ? void 0 : _this$jobInfo4.object,
          operation: (_this$jobInfo5 = this.jobInfo) === null || _this$jobInfo5 === void 0 ? void 0 : _this$jobInfo5.operation,
          lineEnding: (_this$jobInfo6 = this.jobInfo) === null || _this$jobInfo6 === void 0 ? void 0 : _this$jobInfo6.lineEnding
        }),
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        responseType: 'application/json'
      });
      this.emit('open');
    } catch (err) {
      this.emit('error', err);
      throw err;
    }
  }

  /** Upload data for a job in CSV format
   *
   *  @param input CSV as a string, or array of records or readable stream
   */
  async uploadData(input) {
    await (0, _classPrivateFieldGet3.default)(this, _jobData).execute(input);
  }
  async getAllResults() {
    const [successfulResults, failedResults, unprocessedRecords] = await _promise.default.all([this.getSuccessfulResults(), this.getFailedResults(), this.getUnprocessedRecords()]);
    return {
      successfulResults,
      failedResults,
      unprocessedRecords
    };
  }

  /**
   * Close opened job
   */
  async close() {
    try {
      const state = 'UploadComplete';
      this.jobInfo = await this.createIngestRequest({
        method: 'PATCH',
        path: `/${this.jobInfo.id}`,
        body: (0, _stringify.default)({
          state
        }),
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        responseType: 'application/json'
      });
      this.emit('uploadcomplete');
    } catch (err) {
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Set the status to abort
   */
  async abort() {
    try {
      const state = 'Aborted';
      this.jobInfo = await this.createIngestRequest({
        method: 'PATCH',
        path: `/${this.jobInfo.id}`,
        body: (0, _stringify.default)({
          state
        }),
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        responseType: 'application/json'
      });
      this.emit('aborted');
    } catch (err) {
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Poll for the state of the processing for the job.
   *
   * This method will only throw after a timeout. To capture a
   * job failure while polling you must set a listener for the
   * `failed` event before calling it:
   *
   * job.on('failed', (err) => console.error(err))
   * await job.poll()
   *
   * @param interval Polling interval in milliseconds
   * @param timeout Polling timeout in milliseconds
   * @returns {Promise<void>} A promise that resolves when the job finishes successfully
   */
  async poll(interval = (0, _classPrivateFieldGet3.default)(this, _pollingOptions2).pollInterval, timeout = (0, _classPrivateFieldGet3.default)(this, _pollingOptions2).pollTimeout) {
    const jobId = getJobIdOrError(this.jobInfo);
    const startTime = (0, _now.default)();
    while (startTime + timeout > (0, _now.default)()) {
      try {
        const res = await this.check();
        switch (res.state) {
          case 'Open':
            throw new Error('Job has not been started');
          case 'Aborted':
            throw new Error('Job has been aborted');
          case 'UploadComplete':
          case 'InProgress':
            await delay(interval);
            break;
          case 'Failed':
            this.emit('failed', new Error('Ingest job failed to complete.'));
            return;
          case 'JobComplete':
            this.emit('jobcomplete');
            return;
        }
      } catch (err) {
        this.emit('error', err);
        throw err;
      }
    }
    const timeoutError = new JobPollingTimeoutError(`Polling timed out after ${timeout}ms. Job Id = ${jobId}`, jobId);
    this.emit('error', timeoutError);
    throw timeoutError;
  }

  /**
   * Check the latest batch status in server
   */
  async check() {
    try {
      const jobInfo = await this.createIngestRequest({
        method: 'GET',
        path: `/${getJobIdOrError(this.jobInfo)}`,
        responseType: 'application/json'
      });
      this.jobInfo = jobInfo;
      return jobInfo;
    } catch (err) {
      this.emit('error', err);
      throw err;
    }
  }
  async getSuccessfulResults() {
    if ((0, _classPrivateFieldGet3.default)(this, _bulkJobSuccessfulResults)) {
      return (0, _classPrivateFieldGet3.default)(this, _bulkJobSuccessfulResults);
    }
    const results = await this.createIngestRequest({
      method: 'GET',
      path: `/${getJobIdOrError(this.jobInfo)}/successfulResults`,
      responseType: 'text/csv'
    });
    (0, _classPrivateFieldSet2.default)(this, _bulkJobSuccessfulResults, results !== null && results !== void 0 ? results : []);
    return (0, _classPrivateFieldGet3.default)(this, _bulkJobSuccessfulResults);
  }
  async getFailedResults() {
    if ((0, _classPrivateFieldGet3.default)(this, _bulkJobFailedResults)) {
      return (0, _classPrivateFieldGet3.default)(this, _bulkJobFailedResults);
    }
    const results = await this.createIngestRequest({
      method: 'GET',
      path: `/${getJobIdOrError(this.jobInfo)}/failedResults`,
      responseType: 'text/csv'
    });
    (0, _classPrivateFieldSet2.default)(this, _bulkJobFailedResults, results !== null && results !== void 0 ? results : []);
    return (0, _classPrivateFieldGet3.default)(this, _bulkJobFailedResults);
  }
  async getUnprocessedRecords() {
    if ((0, _classPrivateFieldGet3.default)(this, _bulkJobUnprocessedRecords)) {
      return (0, _classPrivateFieldGet3.default)(this, _bulkJobUnprocessedRecords);
    }
    const results = await this.createIngestRequest({
      method: 'GET',
      path: `/${getJobIdOrError(this.jobInfo)}/unprocessedrecords`,
      responseType: 'text/csv'
    });
    (0, _classPrivateFieldSet2.default)(this, _bulkJobUnprocessedRecords, results !== null && results !== void 0 ? results : []);
    return (0, _classPrivateFieldGet3.default)(this, _bulkJobUnprocessedRecords);
  }

  /**
   * Deletes an ingest job.
   */
  async delete() {
    return this.createIngestRequest({
      method: 'DELETE',
      path: `/${getJobIdOrError(this.jobInfo)}`
    });
  }
  createIngestRequest(request) {
    const {
      path,
      responseType
    } = request;
    const baseUrl = [(0, _classPrivateFieldGet3.default)(this, _connection3).instanceUrl, 'services/data', `v${(0, _classPrivateFieldGet3.default)(this, _connection3).version}`, 'jobs/ingest'].join('/');
    return new BulkApiV2((0, _classPrivateFieldGet3.default)(this, _connection3), {
      responseType
    }).request(_objectSpread(_objectSpread({}, request), {}, {
      url: baseUrl + path
    }));
  }
}
exports.IngestJobV2 = IngestJobV2;
var _job = new _weakMap.default();
var _uploadStream = new _weakMap.default();
var _downloadStream = new _weakMap.default();
var _dataStream = new _weakMap.default();
var _result = new _weakMap.default();
class JobDataV2 extends _stream.Writable {
  /**
   *
   */
  constructor(options) {
    super({
      objectMode: true
    });
    _job.set(this, {
      writable: true,
      value: void 0
    });
    _uploadStream.set(this, {
      writable: true,
      value: void 0
    });
    _downloadStream.set(this, {
      writable: true,
      value: void 0
    });
    _dataStream.set(this, {
      writable: true,
      value: void 0
    });
    _result.set(this, {
      writable: true,
      value: void 0
    });
    const createRequest = options.createRequest;
    (0, _classPrivateFieldSet2.default)(this, _job, options.job);
    (0, _classPrivateFieldSet2.default)(this, _uploadStream, new _recordStream.Serializable());
    (0, _classPrivateFieldSet2.default)(this, _downloadStream, new _recordStream.Parsable());
    const converterOptions = {
      nullValue: '#N/A'
    };
    const uploadDataStream = (0, _classPrivateFieldGet3.default)(this, _uploadStream).stream('csv', converterOptions);
    const downloadDataStream = (0, _classPrivateFieldGet3.default)(this, _downloadStream).stream('csv', converterOptions);
    (0, _classPrivateFieldSet2.default)(this, _dataStream, (0, _stream2.concatStreamsAsDuplex)(uploadDataStream, downloadDataStream));
    this.on('finish', () => (0, _classPrivateFieldGet3.default)(this, _uploadStream).end());
    uploadDataStream.once('readable', () => {
      try {
        var _classPrivateFieldGet2;
        // pipe upload data to batch API request stream
        const req = createRequest({
          method: 'PUT',
          path: `/${(_classPrivateFieldGet2 = (0, _classPrivateFieldGet3.default)(this, _job).jobInfo) === null || _classPrivateFieldGet2 === void 0 ? void 0 : _classPrivateFieldGet2.id}/batches`,
          headers: {
            'Content-Type': 'text/csv'
          },
          responseType: 'application/json'
        });
        (async () => {
          try {
            const res = await req;
            this.emit('response', res);
          } catch (err) {
            this.emit('error', err);
          }
        })();
        uploadDataStream.pipe(req.stream());
      } catch (err) {
        this.emit('error', err);
      }
    });
  }
  _write(record_, enc, cb) {
    const {
        Id,
        type,
        attributes
      } = record_,
      rrec = (0, _objectWithoutProperties2.default)(record_, ["Id", "type", "attributes"]);
    let record;
    switch ((0, _classPrivateFieldGet3.default)(this, _job).jobInfo.operation) {
      case 'insert':
        record = rrec;
        break;
      case 'delete':
      case 'hardDelete':
        record = {
          Id
        };
        break;
      default:
        record = _objectSpread({
          Id
        }, rrec);
    }
    (0, _classPrivateFieldGet3.default)(this, _uploadStream).write(record, enc, cb);
  }

  /**
   * Returns duplex stream which accepts CSV data input and batch result output
   */
  stream() {
    return (0, _classPrivateFieldGet3.default)(this, _dataStream);
  }

  /**
   * Execute batch operation
   */
  execute(input) {
    if ((0, _classPrivateFieldGet3.default)(this, _result)) {
      throw new Error('Data can only be uploaded to a job once.');
    }
    (0, _classPrivateFieldSet2.default)(this, _result, new _promise.default((resolve, reject) => {
      this.once('response', () => resolve());
      this.once('error', reject);
    }));
    if ((0, _function.isObject)(input) && 'pipe' in input && (0, _function.isFunction)(input.pipe)) {
      // if input has stream.Readable interface
      input.pipe((0, _classPrivateFieldGet3.default)(this, _dataStream));
    } else {
      if ((0, _isArray.default)(input)) {
        for (const record of input) {
          for (const key of (0, _keys.default)(record)) {
            if (typeof record[key] === 'boolean') {
              record[key] = String(record[key]);
            }
          }
          this.write(record);
        }
        this.end();
      } else if (typeof input === 'string') {
        (0, _classPrivateFieldGet3.default)(this, _dataStream).write(input, 'utf8');
        (0, _classPrivateFieldGet3.default)(this, _dataStream).end();
      }
    }
    return this;
  }

  /**
   * Promise/A+ interface
   * Delegate to promise, return promise instance for batch result
   */
  then(onResolved, onReject) {
    if ((0, _classPrivateFieldGet3.default)(this, _result) === undefined) {
      this.execute();
    }
    return (0, _classPrivateFieldGet3.default)(this, _result).then(onResolved, onReject);
  }
}
function getJobIdOrError(jobInfo) {
  const jobId = jobInfo === null || jobInfo === void 0 ? void 0 : jobInfo.id;
  if (jobId === undefined) {
    throw new Error('No job id, maybe you need to call `job.open()` first.');
  }
  return jobId;
}
function delay(ms) {
  return new _promise.default(resolve => (0, _setTimeout2.default)(resolve, ms));
}

/*--------------------------------------------*/
/*
 * Register hook in connection instantiation for dynamically adding this API module features
 */
(0, _jsforce.registerModule)('bulk', conn => new Bulk(conn));
(0, _jsforce.registerModule)('bulk2', conn => new BulkV2(conn));
var _default = Bulk;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJfZXZlbnRzIiwicmVxdWlyZSIsIl9zdHJlYW0iLCJfbXVsdGlzdHJlYW0iLCJfaW50ZXJvcFJlcXVpcmVEZWZhdWx0IiwiX3JlY29yZFN0cmVhbSIsIl9odHRwQXBpIiwiX2pzZm9yY2UiLCJfc3RyZWFtMiIsIl9mdW5jdGlvbiIsIm93bktleXMiLCJvYmplY3QiLCJlbnVtZXJhYmxlT25seSIsImtleXMiLCJfT2JqZWN0JGtleXMyIiwiX09iamVjdCRnZXRPd25Qcm9wZXJ0eVN5bWJvbHMiLCJzeW1ib2xzIiwiX2ZpbHRlckluc3RhbmNlUHJvcGVydHkiLCJjYWxsIiwic3ltIiwiX09iamVjdCRnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IiLCJlbnVtZXJhYmxlIiwicHVzaCIsImFwcGx5IiwiX29iamVjdFNwcmVhZCIsInRhcmdldCIsImkiLCJhcmd1bWVudHMiLCJsZW5ndGgiLCJzb3VyY2UiLCJfY29udGV4dDUiLCJfZm9yRWFjaEluc3RhbmNlUHJvcGVydHkiLCJPYmplY3QiLCJrZXkiLCJfZGVmaW5lUHJvcGVydHkyIiwiZGVmYXVsdCIsIl9PYmplY3QkZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyIsIl9PYmplY3QkZGVmaW5lUHJvcGVydGllcyIsIl9jb250ZXh0NiIsIl9PYmplY3QkZGVmaW5lUHJvcGVydHkiLCJKb2IiLCJFdmVudEVtaXR0ZXIiLCJjb25zdHJ1Y3RvciIsImJ1bGsiLCJ0eXBlIiwib3BlcmF0aW9uIiwib3B0aW9ucyIsImpvYklkIiwiX2J1bGsiLCJpZCIsInN0YXRlIiwiX2JhdGNoZXMiLCJvbiIsImVycm9yIiwiX2Vycm9yIiwiaW5mbyIsIl9qb2JJbmZvIiwiY2hlY2siLCJvcGVuIiwiRXJyb3IiLCJfY29udGV4dCIsInRvTG93ZXJDYXNlIiwiYm9keSIsIl90cmltIiwiZXh0SWRGaWVsZCIsImNvbmN1cnJlbmN5TW9kZSIsImFzc2lnbm1lbnRSdWxlSWQiLCJyZXMiLCJfcmVxdWVzdCIsIm1ldGhvZCIsInBhdGgiLCJoZWFkZXJzIiwicmVzcG9uc2VUeXBlIiwiZW1pdCIsImpvYkluZm8iLCJlcnIiLCJjcmVhdGVCYXRjaCIsImJhdGNoIiwiQmF0Y2giLCJiYXRjaElkIiwibG9nZ2VyIiwiX2xvZ2dlciIsInJlYWR5IiwiZGVidWciLCJfcHJvbWlzZSIsInJlc29sdmUiLCJ0aGVuIiwibGlzdCIsImJhdGNoSW5mb0xpc3QiLCJiYXRjaEluZm8iLCJfaXNBcnJheSIsImNsb3NlIiwiX2NoYW5nZVN0YXRlIiwiYWJvcnQiLCJfY29udGV4dDIiLCJleHBvcnRzIiwiUG9sbGluZ1RpbWVvdXRFcnJvciIsIm1lc3NhZ2UiLCJuYW1lIiwiSm9iUG9sbGluZ1RpbWVvdXRFcnJvciIsIldyaXRhYmxlIiwiam9iIiwib2JqZWN0TW9kZSIsImV4ZWN1dGUiLCJjb252ZXJ0ZXJPcHRpb25zIiwibnVsbFZhbHVlIiwidXBsb2FkU3RyZWFtIiwiX3VwbG9hZFN0cmVhbSIsIlNlcmlhbGl6YWJsZSIsInVwbG9hZERhdGFTdHJlYW0iLCJzdHJlYW0iLCJkb3dubG9hZFN0cmVhbSIsIl9kb3dubG9hZFN0cmVhbSIsIlBhcnNhYmxlIiwiZG93bmxvYWREYXRhU3RyZWFtIiwiZW5kIiwib25jZSIsInBpcGUiLCJfY3JlYXRlUmVxdWVzdFN0cmVhbSIsIl9kYXRhU3RyZWFtIiwiY29uY2F0U3RyZWFtc0FzRHVwbGV4IiwicmVxIiwiX3dyaXRlIiwicmVjb3JkXyIsImVuYyIsImNiIiwiSWQiLCJhdHRyaWJ1dGVzIiwicnJlYyIsIl9vYmplY3RXaXRob3V0UHJvcGVydGllczIiLCJyZWNvcmQiLCJ3cml0ZSIsImlucHV0IiwiX3Jlc3VsdCIsInJlamVjdCIsImlzT2JqZWN0IiwiaXNGdW5jdGlvbiIsIl9rZXlzIiwiU3RyaW5nIiwib25SZXNvbHZlZCIsIm9uUmVqZWN0IiwicG9sbCIsImludGVydmFsIiwidGltZW91dCIsInN0YXJ0VGltZSIsIkRhdGUiLCJnZXRUaW1lIiwibm93IiwiX3BhcnNlSW50MiIsIm51bWJlclJlY29yZHNQcm9jZXNzZWQiLCJyZXRyaWV2ZSIsInN0YXRlTWVzc2FnZSIsIl9zZXRUaW1lb3V0MiIsInJlc3AiLCJyZXN1bHRzIiwiX2NvbnRleHQzIiwicmVzdWx0SWQiLCJyZXN1bHQiLCJfbWFwIiwicmV0Iiwic3VjY2VzcyIsIlN1Y2Nlc3MiLCJlcnJvcnMiLCJyZXN1bHRTdHJlYW0iLCJyZXN1bHREYXRhU3RyZWFtIiwiQnVsa0FwaSIsIkh0dHBBcGkiLCJiZWZvcmVTZW5kIiwicmVxdWVzdCIsIl90aGlzJF9jb25uJGFjY2Vzc1RvayIsIl9jb25uIiwiYWNjZXNzVG9rZW4iLCJpc1Nlc3Npb25FeHBpcmVkIiwicmVzcG9uc2UiLCJzdGF0dXNDb2RlIiwidGVzdCIsImhhc0Vycm9ySW5SZXNwb25zZUJvZHkiLCJwYXJzZUVycm9yIiwiZXJyb3JDb2RlIiwiZXhjZXB0aW9uQ29kZSIsImV4Y2VwdGlvbk1lc3NhZ2UiLCJCdWxrQXBpVjIiLCJCdWxrIiwiY29ubiIsInJlcXVlc3RfIiwicnJlcSIsImJhc2VVcmwiLCJpbnN0YW5jZVVybCIsInZlcnNpb24iLCJqb2luIiwidXJsIiwibG9hZCIsIm9wdGlvbnNPcklucHV0IiwiY3JlYXRlSm9iIiwiY2xlYW51cCIsImNsZWFudXBPbkVycm9yIiwicG9sbEludGVydmFsIiwicG9sbFRpbWVvdXQiLCJxdWVyeSIsInNvcWwiLCJtIiwicmVwbGFjZSIsIm1hdGNoIiwicmVjb3JkU3RyZWFtIiwiZGF0YVN0cmVhbSIsInN0cmVhbXMiLCJqb2luU3RyZWFtcyIsIl9jb25uZWN0aW9uIiwiX3dlYWtNYXAiLCJCdWxrVjIiLCJjb25uZWN0aW9uIiwic2V0Iiwid3JpdGFibGUiLCJ2YWx1ZSIsIl9jbGFzc1ByaXZhdGVGaWVsZFNldDIiLCJJbmdlc3RKb2JWMiIsIl9jbGFzc1ByaXZhdGVGaWVsZEdldDMiLCJwb2xsaW5nT3B0aW9ucyIsImxvYWRBbmRXYWl0Rm9yUmVzdWx0cyIsInVwbG9hZERhdGEiLCJnZXRBbGxSZXN1bHRzIiwiZGVsZXRlIiwiY2F0Y2giLCJpZ25vcmVkIiwicXVlcnlKb2IiLCJRdWVyeUpvYlYyIiwic2NhbkFsbCIsInRvb2xpbmciLCJnZXRSZXN1bHRzIiwiX2Nvbm5lY3Rpb24yIiwiX29wZXJhdGlvbiIsIl9xdWVyeSIsIl9wb2xsaW5nT3B0aW9ucyIsIl90b29saW5nIiwiX3F1ZXJ5UmVzdWx0cyIsImNyZWF0ZVF1ZXJ5UmVxdWVzdCIsIl9zdHJpbmdpZnkiLCJfdGhpcyRqb2JJbmZvIiwiZ2V0Sm9iSWRPckVycm9yIiwiX25vdyIsImRlbGF5IiwidGltZW91dEVycm9yIiwiaHR0cEFwaSIsImxvY2F0b3IiLCJnZXRSZXN1bHRzVXJsIiwiZmluaXNoZWQiLCJfY29udGV4dDQiLCJuZXh0UmVzdWx0cyIsIkFjY2VwdCIsIl9jb25jYXQiLCJfY29ubmVjdGlvbjMiLCJfcG9sbGluZ09wdGlvbnMyIiwiX2pvYkRhdGEiLCJfYnVsa0pvYlN1Y2Nlc3NmdWxSZXN1bHRzIiwiX2J1bGtKb2JGYWlsZWRSZXN1bHRzIiwiX2J1bGtKb2JVbnByb2Nlc3NlZFJlY29yZHMiLCJfZXJyb3IyIiwiSm9iRGF0YVYyIiwiY3JlYXRlUmVxdWVzdCIsImNyZWF0ZUluZ2VzdFJlcXVlc3QiLCJfdGhpcyRqb2JJbmZvMiIsIl90aGlzJGpvYkluZm8zIiwiX3RoaXMkam9iSW5mbzQiLCJfdGhpcyRqb2JJbmZvNSIsIl90aGlzJGpvYkluZm82IiwiZXh0ZXJuYWxJZEZpZWxkTmFtZSIsImxpbmVFbmRpbmciLCJzdWNjZXNzZnVsUmVzdWx0cyIsImZhaWxlZFJlc3VsdHMiLCJ1bnByb2Nlc3NlZFJlY29yZHMiLCJhbGwiLCJnZXRTdWNjZXNzZnVsUmVzdWx0cyIsImdldEZhaWxlZFJlc3VsdHMiLCJnZXRVbnByb2Nlc3NlZFJlY29yZHMiLCJfam9iIiwiX2NsYXNzUHJpdmF0ZUZpZWxkR2V0MiIsInVuZGVmaW5lZCIsIm1zIiwicmVnaXN0ZXJNb2R1bGUiLCJfZGVmYXVsdCJdLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9hcGkvYnVsay50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBmaWxlIE1hbmFnZXMgU2FsZXNmb3JjZSBCdWxrIEFQSSByZWxhdGVkIG9wZXJhdGlvbnNcbiAqIEBhdXRob3IgU2hpbmljaGkgVG9taXRhIDxzaGluaWNoaS50b21pdGFAZ21haWwuY29tPlxuICovXG5pbXBvcnQgeyBFdmVudEVtaXR0ZXIgfSBmcm9tICdldmVudHMnO1xuaW1wb3J0IHsgRHVwbGV4LCBSZWFkYWJsZSwgV3JpdGFibGUgfSBmcm9tICdzdHJlYW0nO1xuaW1wb3J0IGpvaW5TdHJlYW1zIGZyb20gJ211bHRpc3RyZWFtJztcbmltcG9ydCBDb25uZWN0aW9uIGZyb20gJy4uL2Nvbm5lY3Rpb24nO1xuaW1wb3J0IHsgU2VyaWFsaXphYmxlLCBQYXJzYWJsZSB9IGZyb20gJy4uL3JlY29yZC1zdHJlYW0nO1xuaW1wb3J0IEh0dHBBcGkgZnJvbSAnLi4vaHR0cC1hcGknO1xuaW1wb3J0IHsgU3RyZWFtUHJvbWlzZSB9IGZyb20gJy4uL3V0aWwvcHJvbWlzZSc7XG5pbXBvcnQgeyByZWdpc3Rlck1vZHVsZSB9IGZyb20gJy4uL2pzZm9yY2UnO1xuaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSAnLi4vdXRpbC9sb2dnZXInO1xuaW1wb3J0IHsgY29uY2F0U3RyZWFtc0FzRHVwbGV4IH0gZnJvbSAnLi4vdXRpbC9zdHJlYW0nO1xuaW1wb3J0IHtcbiAgSHR0cE1ldGhvZHMsXG4gIEh0dHBSZXF1ZXN0LFxuICBIdHRwUmVzcG9uc2UsXG4gIFJlY29yZCxcbiAgU2NoZW1hLFxuICBPcHRpb25hbCxcbn0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgaXNGdW5jdGlvbiwgaXNPYmplY3QgfSBmcm9tICcuLi91dGlsL2Z1bmN0aW9uJztcblxuLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbmV4cG9ydCB0eXBlIEJ1bGtPcGVyYXRpb24gPVxuICB8ICdpbnNlcnQnXG4gIHwgJ3VwZGF0ZSdcbiAgfCAndXBzZXJ0J1xuICB8ICdkZWxldGUnXG4gIHwgJ2hhcmREZWxldGUnXG4gIHwgJ3F1ZXJ5J1xuICB8ICdxdWVyeUFsbCc7XG5cbmV4cG9ydCB0eXBlIEluZ2VzdE9wZXJhdGlvbiA9IEV4Y2x1ZGU8QnVsa09wZXJhdGlvbiwgJ3F1ZXJ5JyB8ICdxdWVyeUFsbCc+O1xuXG5leHBvcnQgdHlwZSBRdWVyeU9wZXJhdGlvbiA9IEV4dHJhY3Q8QnVsa09wZXJhdGlvbiwgJ3F1ZXJ5JyB8ICdxdWVyeUFsbCc+O1xuXG5leHBvcnQgdHlwZSBCdWxrT3B0aW9ucyA9IHtcbiAgZXh0SWRGaWVsZD86IHN0cmluZztcbiAgY29uY3VycmVuY3lNb2RlPzogJ1NlcmlhbCcgfCAnUGFyYWxsZWwnO1xuICBhc3NpZ25tZW50UnVsZUlkPzogc3RyaW5nO1xufTtcblxuZXhwb3J0IHR5cGUgSm9iU3RhdGUgPSAnT3BlbicgfCAnQ2xvc2VkJyB8ICdBYm9ydGVkJyB8ICdGYWlsZWQnIHwgJ1Vua25vd24nO1xuXG5leHBvcnQgdHlwZSBKb2JTdGF0ZVYyID1cbiAgfCBFeGNsdWRlPEpvYlN0YXRlLCAnQ2xvc2VkJyB8ICdVbmtub3duJz5cbiAgfCAnVXBsb2FkQ29tcGxldGUnXG4gIHwgJ0luUHJvZ3Jlc3MnXG4gIHwgJ0pvYkNvbXBsZXRlJztcblxuZXhwb3J0IHR5cGUgSm9iSW5mbyA9IHtcbiAgaWQ6IHN0cmluZztcbiAgb2JqZWN0OiBzdHJpbmc7XG4gIG9wZXJhdGlvbjogQnVsa09wZXJhdGlvbjtcbiAgc3RhdGU6IEpvYlN0YXRlO1xufTtcblxuZXhwb3J0IHR5cGUgSm9iSW5mb1YyID0ge1xuICBhcGlWZXJzaW9uOiBzdHJpbmc7XG4gIGFzc2lnbm1lbnRSdWxlSWQ/OiBzdHJpbmc7XG4gIGNvbHVtbkRlbGltaXRlcjpcbiAgICB8ICdCQUNLUVVPVEUnXG4gICAgfCAnQ0FSRVQnXG4gICAgfCAnQ09NTUEnXG4gICAgfCAnUElQRSdcbiAgICB8ICdTRU1JQ09MT04nXG4gICAgfCAnVEFCJztcbiAgY29uY3VycmVuY3lNb2RlOiAnUGFyYWxsZWwnO1xuICBjb250ZW50VHlwZTogJ0NTVic7XG4gIGNvbnRlbnRVcmw6IHN0cmluZztcbiAgY3JlYXRlZEJ5SWQ6IHN0cmluZztcbiAgY3JlYXRlZERhdGU6IHN0cmluZztcbiAgZXh0ZXJuYWxJZEZpZWxkTmFtZT86IHN0cmluZztcbiAgaWQ6IHN0cmluZztcbiAgam9iVHlwZTogJ0JpZ09iamVjdEluZ2VzdCcgfCAnQ2xhc3NpYycgfCAnVjJJbmdlc3QnO1xuICBsaW5lRW5kaW5nOiAnTEYnIHwgJ0NSTEYnO1xuICBvYmplY3Q6IHN0cmluZztcbiAgb3BlcmF0aW9uOiBCdWxrT3BlcmF0aW9uO1xuICBzdGF0ZTogSm9iU3RhdGVWMjtcbiAgc3lzdGVtTW9kc3RhbXA6IHN0cmluZztcbiAgbnVtYmVyUmVjb3Jkc1Byb2Nlc3NlZD86IG51bWJlcjtcbiAgbnVtYmVyUmVjb3Jkc0ZhaWxlZD86IG51bWJlcjtcbn07XG5cbnR5cGUgSm9iSW5mb1Jlc3BvbnNlID0ge1xuICBqb2JJbmZvOiBKb2JJbmZvO1xufTtcblxuZXhwb3J0IHR5cGUgQmF0Y2hTdGF0ZSA9XG4gIHwgJ1F1ZXVlZCdcbiAgfCAnSW5Qcm9ncmVzcydcbiAgfCAnQ29tcGxldGVkJ1xuICB8ICdGYWlsZWQnXG4gIHwgJ05vdFByb2Nlc3NlZCc7XG5cbmV4cG9ydCB0eXBlIEJhdGNoSW5mbyA9IHtcbiAgaWQ6IHN0cmluZztcbiAgam9iSWQ6IHN0cmluZztcbiAgc3RhdGU6IEJhdGNoU3RhdGU7XG4gIHN0YXRlTWVzc2FnZTogc3RyaW5nO1xuICBudW1iZXJSZWNvcmRzUHJvY2Vzc2VkOiBzdHJpbmc7XG4gIG51bWJlclJlY29yZHNGYWlsZWQ6IHN0cmluZztcbiAgdG90YWxQcm9jZXNzaW5nVGltZTogc3RyaW5nO1xufTtcblxudHlwZSBCYXRjaEluZm9SZXNwb25zZSA9IHtcbiAgYmF0Y2hJbmZvOiBCYXRjaEluZm87XG59O1xuXG50eXBlIEJhdGNoSW5mb0xpc3RSZXNwb25zZSA9IHtcbiAgYmF0Y2hJbmZvTGlzdDoge1xuICAgIGJhdGNoSW5mbzogQmF0Y2hJbmZvIHwgQmF0Y2hJbmZvW107XG4gIH07XG59O1xuXG5leHBvcnQgdHlwZSBCdWxrUXVlcnlCYXRjaFJlc3VsdCA9IEFycmF5PHtcbiAgaWQ6IHN0cmluZztcbiAgYmF0Y2hJZDogc3RyaW5nO1xuICBqb2JJZDogc3RyaW5nO1xufT47XG5cbmV4cG9ydCB0eXBlIEJ1bGtJbmdlc3RCYXRjaFJlc3VsdCA9IEFycmF5PHtcbiAgaWQ6IHN0cmluZyB8IG51bGw7XG4gIHN1Y2Nlc3M6IGJvb2xlYW47XG4gIGVycm9yczogc3RyaW5nW107XG59PjtcblxuZXhwb3J0IHR5cGUgQmF0Y2hSZXN1bHQ8T3ByIGV4dGVuZHMgQnVsa09wZXJhdGlvbj4gPSBPcHIgZXh0ZW5kc1xuICB8ICdxdWVyeSdcbiAgfCAncXVlcnlBbGwnXG4gID8gQnVsa1F1ZXJ5QmF0Y2hSZXN1bHRcbiAgOiBCdWxrSW5nZXN0QmF0Y2hSZXN1bHQ7XG5cbnR5cGUgQnVsa0luZ2VzdFJlc3VsdFJlc3BvbnNlID0gQXJyYXk8e1xuICBJZDogc3RyaW5nO1xuICBTdWNjZXNzOiBzdHJpbmc7XG4gIEVycm9yOiBzdHJpbmc7XG59PjtcblxudHlwZSBCdWxrUXVlcnlSZXN1bHRSZXNwb25zZSA9IHtcbiAgJ3Jlc3VsdC1saXN0Jzoge1xuICAgIHJlc3VsdDogc3RyaW5nIHwgc3RyaW5nW107XG4gIH07XG59O1xuXG50eXBlIEJ1bGtSZXF1ZXN0ID0ge1xuICBtZXRob2Q6IEh0dHBNZXRob2RzO1xuICBwYXRoOiBzdHJpbmc7XG4gIGJvZHk/OiBzdHJpbmc7XG4gIGhlYWRlcnM/OiB7IFtuYW1lOiBzdHJpbmddOiBzdHJpbmcgfTtcbiAgcmVzcG9uc2VUeXBlPzogc3RyaW5nO1xufTtcblxuZXhwb3J0IHR5cGUgSW5nZXN0Sm9iVjJTdWNjZXNzZnVsUmVzdWx0czxTIGV4dGVuZHMgU2NoZW1hPiA9IEFycmF5PFxuICB7XG4gICAgc2ZfX0NyZWF0ZWQ6ICd0cnVlJyB8ICdmYWxzZSc7XG4gICAgc2ZfX0lkOiBzdHJpbmc7XG4gIH0gJiBTXG4+O1xuXG5leHBvcnQgdHlwZSBJbmdlc3RKb2JWMkZhaWxlZFJlc3VsdHM8UyBleHRlbmRzIFNjaGVtYT4gPSBBcnJheTxcbiAge1xuICAgIHNmX19FcnJvcjogc3RyaW5nO1xuICAgIHNmX19JZDogc3RyaW5nO1xuICB9ICYgU1xuPjtcblxuZXhwb3J0IHR5cGUgSW5nZXN0Sm9iVjJVbnByb2Nlc3NlZFJlY29yZHM8UyBleHRlbmRzIFNjaGVtYT4gPSBBcnJheTxTPjtcblxuZXhwb3J0IHR5cGUgSW5nZXN0Sm9iVjJSZXN1bHRzPFMgZXh0ZW5kcyBTY2hlbWE+ID0ge1xuICBzdWNjZXNzZnVsUmVzdWx0czogSW5nZXN0Sm9iVjJTdWNjZXNzZnVsUmVzdWx0czxTPjtcbiAgZmFpbGVkUmVzdWx0czogSW5nZXN0Sm9iVjJGYWlsZWRSZXN1bHRzPFM+O1xuICB1bnByb2Nlc3NlZFJlY29yZHM6IEluZ2VzdEpvYlYyVW5wcm9jZXNzZWRSZWNvcmRzPFM+O1xufTtcblxudHlwZSBOZXdJbmdlc3RKb2JPcHRpb25zID0gUmVxdWlyZWQ8UGljazxKb2JJbmZvVjIsICdvYmplY3QnIHwgJ29wZXJhdGlvbic+PiAmXG4gIFBhcnRpYWw8XG4gICAgUGljazxKb2JJbmZvVjIsICdhc3NpZ25tZW50UnVsZUlkJyB8ICdleHRlcm5hbElkRmllbGROYW1lJyB8ICdsaW5lRW5kaW5nJz5cbiAgPjtcblxudHlwZSBFeGlzdGluZ0luZ2VzdEpvYk9wdGlvbnMgPSBQaWNrPEpvYkluZm9WMiwgJ2lkJz47XG5cbnR5cGUgQ3JlYXRlSW5nZXN0Sm9iVjJSZXF1ZXN0ID0gPFQ+KHJlcXVlc3Q6IEJ1bGtSZXF1ZXN0KSA9PiBTdHJlYW1Qcm9taXNlPFQ+O1xuXG50eXBlIENyZWF0ZUluZ2VzdEpvYlYyT3B0aW9uczxTIGV4dGVuZHMgU2NoZW1hPiA9IHtcbiAgY29ubmVjdGlvbjogQ29ubmVjdGlvbjxTPjtcbiAgam9iSW5mbzogTmV3SW5nZXN0Sm9iT3B0aW9ucyB8IEV4aXN0aW5nSW5nZXN0Sm9iT3B0aW9ucztcbiAgcG9sbGluZ09wdGlvbnM6IEJ1bGtWMlBvbGxpbmdPcHRpb25zO1xufTtcblxudHlwZSBDcmVhdGVKb2JEYXRhVjJPcHRpb25zPFMgZXh0ZW5kcyBTY2hlbWEsIE9wciBleHRlbmRzIEluZ2VzdE9wZXJhdGlvbj4gPSB7XG4gIGpvYjogSW5nZXN0Sm9iVjI8UywgT3ByPjtcbiAgY3JlYXRlUmVxdWVzdDogQ3JlYXRlSW5nZXN0Sm9iVjJSZXF1ZXN0O1xufTtcblxudHlwZSBDcmVhdGVRdWVyeUpvYlYyT3B0aW9uczxTIGV4dGVuZHMgU2NoZW1hPiA9IHtcbiAgY29ubmVjdGlvbjogQ29ubmVjdGlvbjxTPjtcbiAgb3BlcmF0aW9uOiBRdWVyeU9wZXJhdGlvbjtcbiAgcXVlcnk6IHN0cmluZztcbiAgcG9sbGluZ09wdGlvbnM6IEJ1bGtWMlBvbGxpbmdPcHRpb25zO1xuICB0b29saW5nOiBib29sZWFuO1xufTtcblxudHlwZSBCdWxrVjJQb2xsaW5nT3B0aW9ucyA9IHtcbiAgcG9sbEludGVydmFsOiBudW1iZXI7XG4gIHBvbGxUaW1lb3V0OiBudW1iZXI7XG59O1xuXG4vKipcbiAqIENsYXNzIGZvciBCdWxrIEFQSSBKb2JcbiAqL1xuZXhwb3J0IGNsYXNzIEpvYjxcbiAgUyBleHRlbmRzIFNjaGVtYSxcbiAgT3ByIGV4dGVuZHMgQnVsa09wZXJhdGlvblxuPiBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIHR5cGU6IHN0cmluZyB8IG51bGw7XG4gIG9wZXJhdGlvbjogT3ByIHwgbnVsbDtcbiAgb3B0aW9uczogQnVsa09wdGlvbnM7XG4gIGlkOiBzdHJpbmcgfCBudWxsO1xuICBzdGF0ZTogSm9iU3RhdGU7XG4gIF9idWxrOiBCdWxrPFM+O1xuICBfYmF0Y2hlczogeyBbaWQ6IHN0cmluZ106IEJhdGNoPFMsIE9wcj4gfTtcbiAgX2pvYkluZm86IFByb21pc2U8Sm9iSW5mbz4gfCB1bmRlZmluZWQ7XG4gIF9lcnJvcjogRXJyb3IgfCB1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICBidWxrOiBCdWxrPFM+LFxuICAgIHR5cGU6IHN0cmluZyB8IG51bGwsXG4gICAgb3BlcmF0aW9uOiBPcHIgfCBudWxsLFxuICAgIG9wdGlvbnM6IEJ1bGtPcHRpb25zIHwgbnVsbCxcbiAgICBqb2JJZD86IHN0cmluZyxcbiAgKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLl9idWxrID0gYnVsaztcbiAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICAgIHRoaXMub3BlcmF0aW9uID0gb3BlcmF0aW9uO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdGhpcy5pZCA9IGpvYklkID8/IG51bGw7XG4gICAgdGhpcy5zdGF0ZSA9IHRoaXMuaWQgPyAnT3BlbicgOiAnVW5rbm93bic7XG4gICAgdGhpcy5fYmF0Y2hlcyA9IHt9O1xuICAgIC8vIGRlZmF1bHQgZXJyb3IgaGFuZGxlciB0byBrZWVwIHRoZSBsYXRlc3QgZXJyb3JcbiAgICB0aGlzLm9uKCdlcnJvcicsIChlcnJvcikgPT4gKHRoaXMuX2Vycm9yID0gZXJyb3IpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gbGF0ZXN0IGpvYkluZm8gZnJvbSBjYWNoZVxuICAgKi9cbiAgaW5mbygpIHtcbiAgICAvLyBpZiBjYWNoZSBpcyBub3QgYXZhaWxhYmxlLCBjaGVjayB0aGUgbGF0ZXN0XG4gICAgaWYgKCF0aGlzLl9qb2JJbmZvKSB7XG4gICAgICB0aGlzLl9qb2JJbmZvID0gdGhpcy5jaGVjaygpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fam9iSW5mbztcbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVuIG5ldyBqb2IgYW5kIGdldCBqb2JpbmZvXG4gICAqL1xuICBvcGVuKCk6IFByb21pc2U8Sm9iSW5mbz4ge1xuICAgIGNvbnN0IGJ1bGsgPSB0aGlzLl9idWxrO1xuICAgIGNvbnN0IG9wdGlvbnMgPSB0aGlzLm9wdGlvbnM7XG5cbiAgICAvLyBpZiBzb2JqZWN0IHR5cGUgLyBvcGVyYXRpb24gaXMgbm90IHByb3ZpZGVkXG4gICAgaWYgKCF0aGlzLnR5cGUgfHwgIXRoaXMub3BlcmF0aW9uKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3R5cGUgLyBvcGVyYXRpb24gaXMgcmVxdWlyZWQgdG8gb3BlbiBhIG5ldyBqb2InKTtcbiAgICB9XG5cbiAgICAvLyBpZiBub3QgcmVxdWVzdGVkIG9wZW5pbmcgam9iXG4gICAgaWYgKCF0aGlzLl9qb2JJbmZvKSB7XG4gICAgICBsZXQgb3BlcmF0aW9uID0gdGhpcy5vcGVyYXRpb24udG9Mb3dlckNhc2UoKTtcbiAgICAgIGlmIChvcGVyYXRpb24gPT09ICdoYXJkZGVsZXRlJykge1xuICAgICAgICBvcGVyYXRpb24gPSAnaGFyZERlbGV0ZSc7XG4gICAgICB9XG4gICAgICBpZiAob3BlcmF0aW9uID09PSAncXVlcnlhbGwnKSB7XG4gICAgICAgIG9wZXJhdGlvbiA9ICdxdWVyeUFsbCc7XG4gICAgICB9XG4gICAgICBjb25zdCBib2R5ID0gYFxuPD94bWwgdmVyc2lvbj1cIjEuMFwiIGVuY29kaW5nPVwiVVRGLThcIj8+XG48am9iSW5mbyAgeG1sbnM9XCJodHRwOi8vd3d3LmZvcmNlLmNvbS8yMDA5LzA2L2FzeW5jYXBpL2RhdGFsb2FkXCI+XG4gIDxvcGVyYXRpb24+JHtvcGVyYXRpb259PC9vcGVyYXRpb24+XG4gIDxvYmplY3Q+JHt0aGlzLnR5cGV9PC9vYmplY3Q+XG4gICR7XG4gICAgb3B0aW9ucy5leHRJZEZpZWxkXG4gICAgICA/IGA8ZXh0ZXJuYWxJZEZpZWxkTmFtZT4ke29wdGlvbnMuZXh0SWRGaWVsZH08L2V4dGVybmFsSWRGaWVsZE5hbWU+YFxuICAgICAgOiAnJ1xuICB9XG4gICR7XG4gICAgb3B0aW9ucy5jb25jdXJyZW5jeU1vZGVcbiAgICAgID8gYDxjb25jdXJyZW5jeU1vZGU+JHtvcHRpb25zLmNvbmN1cnJlbmN5TW9kZX08L2NvbmN1cnJlbmN5TW9kZT5gXG4gICAgICA6ICcnXG4gIH1cbiAgJHtcbiAgICBvcHRpb25zLmFzc2lnbm1lbnRSdWxlSWRcbiAgICAgID8gYDxhc3NpZ25tZW50UnVsZUlkPiR7b3B0aW9ucy5hc3NpZ25tZW50UnVsZUlkfTwvYXNzaWdubWVudFJ1bGVJZD5gXG4gICAgICA6ICcnXG4gIH1cbiAgPGNvbnRlbnRUeXBlPkNTVjwvY29udGVudFR5cGU+XG48L2pvYkluZm8+XG4gICAgICBgLnRyaW0oKTtcblxuICAgICAgdGhpcy5fam9iSW5mbyA9IChhc3luYyAoKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgcmVzID0gYXdhaXQgYnVsay5fcmVxdWVzdDxKb2JJbmZvUmVzcG9uc2U+KHtcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgcGF0aDogJy9qb2InLFxuICAgICAgICAgICAgYm9keSxcbiAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi94bWw7IGNoYXJzZXQ9dXRmLTgnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJlc3BvbnNlVHlwZTogJ2FwcGxpY2F0aW9uL3htbCcsXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdGhpcy5lbWl0KCdvcGVuJywgcmVzLmpvYkluZm8pO1xuICAgICAgICAgIHRoaXMuaWQgPSByZXMuam9iSW5mby5pZDtcbiAgICAgICAgICB0aGlzLnN0YXRlID0gcmVzLmpvYkluZm8uc3RhdGU7XG4gICAgICAgICAgcmV0dXJuIHJlcy5qb2JJbmZvO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICB0aGlzLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH1cbiAgICAgIH0pKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9qb2JJbmZvO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBiYXRjaCBpbnN0YW5jZSBpbiB0aGUgam9iXG4gICAqL1xuICBjcmVhdGVCYXRjaCgpOiBCYXRjaDxTLCBPcHI+IHtcbiAgICBjb25zdCBiYXRjaCA9IG5ldyBCYXRjaCh0aGlzKTtcbiAgICBiYXRjaC5vbigncXVldWUnLCAoKSA9PiB7XG4gICAgICB0aGlzLl9iYXRjaGVzW2JhdGNoLmlkIV0gPSBiYXRjaDtcbiAgICB9KTtcbiAgICByZXR1cm4gYmF0Y2g7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGEgYmF0Y2ggaW5zdGFuY2Ugc3BlY2lmaWVkIGJ5IGdpdmVuIGJhdGNoIElEXG4gICAqL1xuICBiYXRjaChiYXRjaElkOiBzdHJpbmcpOiBCYXRjaDxTLCBPcHI+IHtcbiAgICBsZXQgYmF0Y2ggPSB0aGlzLl9iYXRjaGVzW2JhdGNoSWRdO1xuICAgIGlmICghYmF0Y2gpIHtcbiAgICAgIGJhdGNoID0gbmV3IEJhdGNoKHRoaXMsIGJhdGNoSWQpO1xuICAgICAgdGhpcy5fYmF0Y2hlc1tiYXRjaElkXSA9IGJhdGNoO1xuICAgIH1cbiAgICByZXR1cm4gYmF0Y2g7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgdGhlIGxhdGVzdCBqb2Igc3RhdHVzIGZyb20gc2VydmVyXG4gICAqL1xuICBjaGVjaygpIHtcbiAgICBjb25zdCBidWxrID0gdGhpcy5fYnVsaztcbiAgICBjb25zdCBsb2dnZXIgPSBidWxrLl9sb2dnZXI7XG5cbiAgICB0aGlzLl9qb2JJbmZvID0gKGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGpvYklkID0gYXdhaXQgdGhpcy5yZWFkeSgpO1xuICAgICAgY29uc3QgcmVzID0gYXdhaXQgYnVsay5fcmVxdWVzdDxKb2JJbmZvUmVzcG9uc2U+KHtcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgcGF0aDogJy9qb2IvJyArIGpvYklkLFxuICAgICAgICByZXNwb25zZVR5cGU6ICdhcHBsaWNhdGlvbi94bWwnLFxuICAgICAgfSk7XG4gICAgICBsb2dnZXIuZGVidWcocmVzLmpvYkluZm8pO1xuICAgICAgdGhpcy5pZCA9IHJlcy5qb2JJbmZvLmlkO1xuICAgICAgdGhpcy50eXBlID0gcmVzLmpvYkluZm8ub2JqZWN0O1xuICAgICAgdGhpcy5vcGVyYXRpb24gPSByZXMuam9iSW5mby5vcGVyYXRpb24gYXMgT3ByO1xuICAgICAgdGhpcy5zdGF0ZSA9IHJlcy5qb2JJbmZvLnN0YXRlO1xuICAgICAgcmV0dXJuIHJlcy5qb2JJbmZvO1xuICAgIH0pKCk7XG5cbiAgICByZXR1cm4gdGhpcy5fam9iSW5mbztcbiAgfVxuXG4gIC8qKlxuICAgKiBXYWl0IHRpbGwgdGhlIGpvYiBpcyBhc3NpZ25lZCB0byBzZXJ2ZXJcbiAgICovXG4gIHJlYWR5KCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgcmV0dXJuIHRoaXMuaWRcbiAgICAgID8gUHJvbWlzZS5yZXNvbHZlKHRoaXMuaWQpXG4gICAgICA6IHRoaXMub3BlbigpLnRoZW4oKHsgaWQgfSkgPT4gaWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIExpc3QgYWxsIHJlZ2lzdGVyZWQgYmF0Y2ggaW5mbyBpbiBqb2JcbiAgICovXG4gIGFzeW5jIGxpc3QoKSB7XG4gICAgY29uc3QgYnVsayA9IHRoaXMuX2J1bGs7XG4gICAgY29uc3QgbG9nZ2VyID0gYnVsay5fbG9nZ2VyO1xuICAgIGNvbnN0IGpvYklkID0gYXdhaXQgdGhpcy5yZWFkeSgpO1xuICAgIGNvbnN0IHJlcyA9IGF3YWl0IGJ1bGsuX3JlcXVlc3Q8QmF0Y2hJbmZvTGlzdFJlc3BvbnNlPih7XG4gICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgcGF0aDogJy9qb2IvJyArIGpvYklkICsgJy9iYXRjaCcsXG4gICAgICByZXNwb25zZVR5cGU6ICdhcHBsaWNhdGlvbi94bWwnLFxuICAgIH0pO1xuICAgIGxvZ2dlci5kZWJ1ZyhyZXMuYmF0Y2hJbmZvTGlzdC5iYXRjaEluZm8pO1xuICAgIGNvbnN0IGJhdGNoSW5mb0xpc3QgPSBBcnJheS5pc0FycmF5KHJlcy5iYXRjaEluZm9MaXN0LmJhdGNoSW5mbylcbiAgICAgID8gcmVzLmJhdGNoSW5mb0xpc3QuYmF0Y2hJbmZvXG4gICAgICA6IFtyZXMuYmF0Y2hJbmZvTGlzdC5iYXRjaEluZm9dO1xuICAgIHJldHVybiBiYXRjaEluZm9MaXN0O1xuICB9XG5cbiAgLyoqXG4gICAqIENsb3NlIG9wZW5lZCBqb2JcbiAgICovXG4gIGFzeW5jIGNsb3NlKCkge1xuICAgIGlmICghdGhpcy5pZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3Qgam9iSW5mbyA9IGF3YWl0IHRoaXMuX2NoYW5nZVN0YXRlKCdDbG9zZWQnKTtcbiAgICAgIHRoaXMuaWQgPSBudWxsO1xuICAgICAgdGhpcy5lbWl0KCdjbG9zZScsIGpvYkluZm8pO1xuICAgICAgcmV0dXJuIGpvYkluZm87XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2V0IHRoZSBzdGF0dXMgdG8gYWJvcnRcbiAgICovXG4gIGFzeW5jIGFib3J0KCkge1xuICAgIGlmICghdGhpcy5pZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3Qgam9iSW5mbyA9IGF3YWl0IHRoaXMuX2NoYW5nZVN0YXRlKCdBYm9ydGVkJyk7XG4gICAgICB0aGlzLmlkID0gbnVsbDtcbiAgICAgIHRoaXMuZW1pdCgnYWJvcnQnLCBqb2JJbmZvKTtcbiAgICAgIHJldHVybiBqb2JJbmZvO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBhc3luYyBfY2hhbmdlU3RhdGUoc3RhdGU6IEpvYlN0YXRlKSB7XG4gICAgY29uc3QgYnVsayA9IHRoaXMuX2J1bGs7XG4gICAgY29uc3QgbG9nZ2VyID0gYnVsay5fbG9nZ2VyO1xuXG4gICAgdGhpcy5fam9iSW5mbyA9IChhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBqb2JJZCA9IGF3YWl0IHRoaXMucmVhZHkoKTtcbiAgICAgIGNvbnN0IGJvZHkgPSBgIFxuPD94bWwgdmVyc2lvbj1cIjEuMFwiIGVuY29kaW5nPVwiVVRGLThcIj8+XG4gIDxqb2JJbmZvIHhtbG5zPVwiaHR0cDovL3d3dy5mb3JjZS5jb20vMjAwOS8wNi9hc3luY2FwaS9kYXRhbG9hZFwiPlxuICA8c3RhdGU+JHtzdGF0ZX08L3N0YXRlPlxuPC9qb2JJbmZvPlxuICAgICAgYC50cmltKCk7XG4gICAgICBjb25zdCByZXMgPSBhd2FpdCBidWxrLl9yZXF1ZXN0PEpvYkluZm9SZXNwb25zZT4oe1xuICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgcGF0aDogJy9qb2IvJyArIGpvYklkLFxuICAgICAgICBib2R5OiBib2R5LFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi94bWw7IGNoYXJzZXQ9dXRmLTgnLFxuICAgICAgICB9LFxuICAgICAgICByZXNwb25zZVR5cGU6ICdhcHBsaWNhdGlvbi94bWwnLFxuICAgICAgfSk7XG4gICAgICBsb2dnZXIuZGVidWcocmVzLmpvYkluZm8pO1xuICAgICAgdGhpcy5zdGF0ZSA9IHJlcy5qb2JJbmZvLnN0YXRlO1xuICAgICAgcmV0dXJuIHJlcy5qb2JJbmZvO1xuICAgIH0pKCk7XG4gICAgcmV0dXJuIHRoaXMuX2pvYkluZm87XG4gIH1cbn1cblxuLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5jbGFzcyBQb2xsaW5nVGltZW91dEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBqb2JJZDogc3RyaW5nO1xuICBiYXRjaElkOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqXG4gICAqL1xuICBjb25zdHJ1Y3RvcihtZXNzYWdlOiBzdHJpbmcsIGpvYklkOiBzdHJpbmcsIGJhdGNoSWQ6IHN0cmluZykge1xuICAgIHN1cGVyKG1lc3NhZ2UpO1xuICAgIHRoaXMubmFtZSA9ICdQb2xsaW5nVGltZW91dCc7XG4gICAgdGhpcy5qb2JJZCA9IGpvYklkO1xuICAgIHRoaXMuYmF0Y2hJZCA9IGJhdGNoSWQ7XG4gIH1cbn1cblxuY2xhc3MgSm9iUG9sbGluZ1RpbWVvdXRFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgam9iSWQ6IHN0cmluZztcblxuICAvKipcbiAgICpcbiAgICovXG4gIGNvbnN0cnVjdG9yKG1lc3NhZ2U6IHN0cmluZywgam9iSWQ6IHN0cmluZykge1xuICAgIHN1cGVyKG1lc3NhZ2UpO1xuICAgIHRoaXMubmFtZSA9ICdKb2JQb2xsaW5nVGltZW91dCc7XG4gICAgdGhpcy5qb2JJZCA9IGpvYklkO1xuICB9XG59XG5cbi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuLyoqXG4gKiBCYXRjaCAoZXh0ZW5kcyBXcml0YWJsZSlcbiAqL1xuZXhwb3J0IGNsYXNzIEJhdGNoPFxuICBTIGV4dGVuZHMgU2NoZW1hLFxuICBPcHIgZXh0ZW5kcyBCdWxrT3BlcmF0aW9uXG4+IGV4dGVuZHMgV3JpdGFibGUge1xuICBqb2I6IEpvYjxTLCBPcHI+O1xuICBpZDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBfYnVsazogQnVsazxTPjtcbiAgX3VwbG9hZFN0cmVhbTogU2VyaWFsaXphYmxlO1xuICBfZG93bmxvYWRTdHJlYW06IFBhcnNhYmxlO1xuICBfZGF0YVN0cmVhbTogRHVwbGV4O1xuICBfcmVzdWx0OiBQcm9taXNlPEJhdGNoUmVzdWx0PE9wcj4+IHwgdW5kZWZpbmVkO1xuICBfZXJyb3I6IEVycm9yIHwgdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKlxuICAgKi9cbiAgY29uc3RydWN0b3Ioam9iOiBKb2I8UywgT3ByPiwgaWQ/OiBzdHJpbmcpIHtcbiAgICBzdXBlcih7IG9iamVjdE1vZGU6IHRydWUgfSk7XG4gICAgdGhpcy5qb2IgPSBqb2I7XG4gICAgdGhpcy5pZCA9IGlkO1xuICAgIHRoaXMuX2J1bGsgPSBqb2IuX2J1bGs7XG5cbiAgICAvLyBkZWZhdWx0IGVycm9yIGhhbmRsZXIgdG8ga2VlcCB0aGUgbGF0ZXN0IGVycm9yXG4gICAgdGhpcy5vbignZXJyb3InLCAoZXJyb3IpID0+ICh0aGlzLl9lcnJvciA9IGVycm9yKSk7XG5cbiAgICAvL1xuICAgIC8vIHNldHVwIGRhdGEgc3RyZWFtc1xuICAgIC8vXG4gICAgY29uc3QgY29udmVydGVyT3B0aW9ucyA9IHsgbnVsbFZhbHVlOiAnI04vQScgfTtcbiAgICBjb25zdCB1cGxvYWRTdHJlYW0gPSAodGhpcy5fdXBsb2FkU3RyZWFtID0gbmV3IFNlcmlhbGl6YWJsZSgpKTtcbiAgICBjb25zdCB1cGxvYWREYXRhU3RyZWFtID0gdXBsb2FkU3RyZWFtLnN0cmVhbSgnY3N2JywgY29udmVydGVyT3B0aW9ucyk7XG4gICAgY29uc3QgZG93bmxvYWRTdHJlYW0gPSAodGhpcy5fZG93bmxvYWRTdHJlYW0gPSBuZXcgUGFyc2FibGUoKSk7XG4gICAgY29uc3QgZG93bmxvYWREYXRhU3RyZWFtID0gZG93bmxvYWRTdHJlYW0uc3RyZWFtKCdjc3YnLCBjb252ZXJ0ZXJPcHRpb25zKTtcblxuICAgIHRoaXMub24oJ2ZpbmlzaCcsICgpID0+IHVwbG9hZFN0cmVhbS5lbmQoKSk7XG4gICAgdXBsb2FkRGF0YVN0cmVhbS5vbmNlKCdyZWFkYWJsZScsIGFzeW5jICgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIGVuc3VyZSB0aGUgam9iIGlzIG9wZW5lZCBpbiBzZXJ2ZXIgb3Igam9iIGlkIGlzIGFscmVhZHkgYXNzaWduZWRcbiAgICAgICAgYXdhaXQgdGhpcy5qb2IucmVhZHkoKTtcbiAgICAgICAgLy8gcGlwZSB1cGxvYWQgZGF0YSB0byBiYXRjaCBBUEkgcmVxdWVzdCBzdHJlYW1cbiAgICAgICAgdXBsb2FkRGF0YVN0cmVhbS5waXBlKHRoaXMuX2NyZWF0ZVJlcXVlc3RTdHJlYW0oKSk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgdGhpcy5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBkdXBsZXggZGF0YSBzdHJlYW0sIG9wZW5lZCBhY2Nlc3MgdG8gQVBJIHByb2dyYW1tZXJzIGJ5IEJhdGNoI3N0cmVhbSgpXG4gICAgdGhpcy5fZGF0YVN0cmVhbSA9IGNvbmNhdFN0cmVhbXNBc0R1cGxleChcbiAgICAgIHVwbG9hZERhdGFTdHJlYW0sXG4gICAgICBkb3dubG9hZERhdGFTdHJlYW0sXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb25uZWN0IGJhdGNoIEFQSSBhbmQgY3JlYXRlIHN0cmVhbSBpbnN0YW5jZSBvZiByZXF1ZXN0L3Jlc3BvbnNlXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfY3JlYXRlUmVxdWVzdFN0cmVhbSgpIHtcbiAgICBjb25zdCBidWxrID0gdGhpcy5fYnVsaztcbiAgICBjb25zdCBsb2dnZXIgPSBidWxrLl9sb2dnZXI7XG4gICAgY29uc3QgcmVxID0gYnVsay5fcmVxdWVzdDxCYXRjaEluZm9SZXNwb25zZT4oe1xuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICBwYXRoOiAnL2pvYi8nICsgdGhpcy5qb2IuaWQgKyAnL2JhdGNoJyxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICd0ZXh0L2NzdicsXG4gICAgICB9LFxuICAgICAgcmVzcG9uc2VUeXBlOiAnYXBwbGljYXRpb24veG1sJyxcbiAgICB9KTtcbiAgICAoYXN5bmMgKCkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzID0gYXdhaXQgcmVxO1xuICAgICAgICBsb2dnZXIuZGVidWcocmVzLmJhdGNoSW5mbyk7XG4gICAgICAgIHRoaXMuaWQgPSByZXMuYmF0Y2hJbmZvLmlkO1xuICAgICAgICB0aGlzLmVtaXQoJ3F1ZXVlJywgcmVzLmJhdGNoSW5mbyk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgdGhpcy5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgICB9XG4gICAgfSkoKTtcbiAgICByZXR1cm4gcmVxLnN0cmVhbSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIEltcGxlbWVudGF0aW9uIG9mIFdyaXRhYmxlXG4gICAqL1xuICBfd3JpdGUocmVjb3JkXzogUmVjb3JkLCBlbmM6IHN0cmluZywgY2I6ICgpID0+IHZvaWQpIHtcbiAgICBjb25zdCB7IElkLCB0eXBlLCBhdHRyaWJ1dGVzLCAuLi5ycmVjIH0gPSByZWNvcmRfO1xuICAgIGxldCByZWNvcmQ7XG4gICAgc3dpdGNoICh0aGlzLmpvYi5vcGVyYXRpb24pIHtcbiAgICAgIGNhc2UgJ2luc2VydCc6XG4gICAgICAgIHJlY29yZCA9IHJyZWM7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnZGVsZXRlJzpcbiAgICAgIGNhc2UgJ2hhcmREZWxldGUnOlxuICAgICAgICByZWNvcmQgPSB7IElkIH07XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmVjb3JkID0geyBJZCwgLi4ucnJlYyB9O1xuICAgIH1cbiAgICB0aGlzLl91cGxvYWRTdHJlYW0ud3JpdGUocmVjb3JkLCBlbmMsIGNiKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGR1cGxleCBzdHJlYW0gd2hpY2ggYWNjZXB0cyBDU1YgZGF0YSBpbnB1dCBhbmQgYmF0Y2ggcmVzdWx0IG91dHB1dFxuICAgKi9cbiAgc3RyZWFtKCkge1xuICAgIHJldHVybiB0aGlzLl9kYXRhU3RyZWFtO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4ZWN1dGUgYmF0Y2ggb3BlcmF0aW9uXG4gICAqL1xuICBleGVjdXRlKGlucHV0Pzogc3RyaW5nIHwgUmVjb3JkW10gfCBSZWFkYWJsZSkge1xuICAgIC8vIGlmIGJhdGNoIGlzIGFscmVhZHkgZXhlY3V0ZWRcbiAgICBpZiAodGhpcy5fcmVzdWx0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0JhdGNoIGFscmVhZHkgZXhlY3V0ZWQuJyk7XG4gICAgfVxuXG4gICAgdGhpcy5fcmVzdWx0ID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5vbmNlKCdyZXNwb25zZScsIHJlc29sdmUpO1xuICAgICAgdGhpcy5vbmNlKCdlcnJvcicsIHJlamVjdCk7XG4gICAgfSk7XG5cbiAgICBpZiAoaXNPYmplY3QoaW5wdXQpICYmICdwaXBlJyBpbiBpbnB1dCAmJiBpc0Z1bmN0aW9uKGlucHV0LnBpcGUpKSB7XG4gICAgICAvLyBpZiBpbnB1dCBoYXMgc3RyZWFtLlJlYWRhYmxlIGludGVyZmFjZVxuICAgICAgaW5wdXQucGlwZSh0aGlzLl9kYXRhU3RyZWFtKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoaW5wdXQpKSB7XG4gICAgICAgIGZvciAoY29uc3QgcmVjb3JkIG9mIGlucHV0KSB7XG4gICAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMocmVjb3JkKSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiByZWNvcmRba2V5XSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgIHJlY29yZFtrZXldID0gU3RyaW5nKHJlY29yZFtrZXldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy53cml0ZShyZWNvcmQpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZW5kKCk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhpcy5fZGF0YVN0cmVhbS53cml0ZShpbnB1dCwgJ3V0ZjgnKTtcbiAgICAgICAgdGhpcy5fZGF0YVN0cmVhbS5lbmQoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyByZXR1cm4gQmF0Y2ggaW5zdGFuY2UgZm9yIGNoYWluaW5nXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBydW4gPSB0aGlzLmV4ZWN1dGU7XG5cbiAgZXhlYyA9IHRoaXMuZXhlY3V0ZTtcblxuICAvKipcbiAgICogUHJvbWlzZS9BKyBpbnRlcmZhY2VcbiAgICogRGVsZWdhdGUgdG8gcHJvbWlzZSwgcmV0dXJuIHByb21pc2UgaW5zdGFuY2UgZm9yIGJhdGNoIHJlc3VsdFxuICAgKi9cbiAgdGhlbihcbiAgICBvblJlc29sdmVkOiAocmVzOiBCYXRjaFJlc3VsdDxPcHI+KSA9PiB2b2lkLFxuICAgIG9uUmVqZWN0OiAoZXJyOiBhbnkpID0+IHZvaWQsXG4gICkge1xuICAgIGlmICghdGhpcy5fcmVzdWx0KSB7XG4gICAgICB0aGlzLmV4ZWN1dGUoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3Jlc3VsdCEudGhlbihvblJlc29sdmVkLCBvblJlamVjdCk7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgdGhlIGxhdGVzdCBiYXRjaCBzdGF0dXMgaW4gc2VydmVyXG4gICAqL1xuICBhc3luYyBjaGVjaygpIHtcbiAgICBjb25zdCBidWxrID0gdGhpcy5fYnVsaztcbiAgICBjb25zdCBsb2dnZXIgPSBidWxrLl9sb2dnZXI7XG4gICAgY29uc3Qgam9iSWQgPSB0aGlzLmpvYi5pZDtcbiAgICBjb25zdCBiYXRjaElkID0gdGhpcy5pZDtcblxuICAgIGlmICgham9iSWQgfHwgIWJhdGNoSWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQmF0Y2ggbm90IHN0YXJ0ZWQuJyk7XG4gICAgfVxuICAgIGNvbnN0IHJlcyA9IGF3YWl0IGJ1bGsuX3JlcXVlc3Q8QmF0Y2hJbmZvUmVzcG9uc2U+KHtcbiAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICBwYXRoOiAnL2pvYi8nICsgam9iSWQgKyAnL2JhdGNoLycgKyBiYXRjaElkLFxuICAgICAgcmVzcG9uc2VUeXBlOiAnYXBwbGljYXRpb24veG1sJyxcbiAgICB9KTtcbiAgICBsb2dnZXIuZGVidWcocmVzLmJhdGNoSW5mbyk7XG4gICAgcmV0dXJuIHJlcy5iYXRjaEluZm87XG4gIH1cblxuICAvKipcbiAgICogUG9sbGluZyB0aGUgYmF0Y2ggcmVzdWx0IGFuZCByZXRyaWV2ZVxuICAgKi9cbiAgcG9sbChpbnRlcnZhbDogbnVtYmVyLCB0aW1lb3V0OiBudW1iZXIpIHtcbiAgICBjb25zdCBqb2JJZCA9IHRoaXMuam9iLmlkO1xuICAgIGNvbnN0IGJhdGNoSWQgPSB0aGlzLmlkO1xuXG4gICAgaWYgKCFqb2JJZCB8fCAhYmF0Y2hJZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdCYXRjaCBub3Qgc3RhcnRlZC4nKTtcbiAgICB9XG4gICAgY29uc3Qgc3RhcnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgY29uc3QgcG9sbCA9IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgaWYgKHN0YXJ0VGltZSArIHRpbWVvdXQgPCBub3cpIHtcbiAgICAgICAgY29uc3QgZXJyID0gbmV3IFBvbGxpbmdUaW1lb3V0RXJyb3IoXG4gICAgICAgICAgJ1BvbGxpbmcgdGltZSBvdXQuIEpvYiBJZCA9ICcgKyBqb2JJZCArICcgLCBiYXRjaCBJZCA9ICcgKyBiYXRjaElkLFxuICAgICAgICAgIGpvYklkLFxuICAgICAgICAgIGJhdGNoSWQsXG4gICAgICAgICk7XG4gICAgICAgIHRoaXMuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBsZXQgcmVzO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzID0gYXdhaXQgdGhpcy5jaGVjaygpO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHRoaXMuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAocmVzLnN0YXRlID09PSAnRmFpbGVkJykge1xuICAgICAgICBpZiAocGFyc2VJbnQocmVzLm51bWJlclJlY29yZHNQcm9jZXNzZWQsIDEwKSA+IDApIHtcbiAgICAgICAgICB0aGlzLnJldHJpZXZlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5lbWl0KCdlcnJvcicsIG5ldyBFcnJvcihyZXMuc3RhdGVNZXNzYWdlKSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocmVzLnN0YXRlID09PSAnQ29tcGxldGVkJykge1xuICAgICAgICB0aGlzLnJldHJpZXZlKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmVtaXQoJ3Byb2dyZXNzJywgcmVzKTtcbiAgICAgICAgc2V0VGltZW91dChwb2xsLCBpbnRlcnZhbCk7XG4gICAgICB9XG4gICAgfTtcbiAgICBzZXRUaW1lb3V0KHBvbGwsIGludGVydmFsKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSBiYXRjaCByZXN1bHRcbiAgICovXG4gIGFzeW5jIHJldHJpZXZlKCkge1xuICAgIGNvbnN0IGJ1bGsgPSB0aGlzLl9idWxrO1xuICAgIGNvbnN0IGpvYklkID0gdGhpcy5qb2IuaWQ7XG4gICAgY29uc3Qgam9iID0gdGhpcy5qb2I7XG4gICAgY29uc3QgYmF0Y2hJZCA9IHRoaXMuaWQ7XG5cbiAgICBpZiAoIWpvYklkIHx8ICFiYXRjaElkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0JhdGNoIG5vdCBzdGFydGVkLicpO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwID0gYXdhaXQgYnVsay5fcmVxdWVzdDxcbiAgICAgICAgQnVsa0luZ2VzdFJlc3VsdFJlc3BvbnNlIHwgQnVsa1F1ZXJ5UmVzdWx0UmVzcG9uc2VcbiAgICAgID4oe1xuICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICBwYXRoOiAnL2pvYi8nICsgam9iSWQgKyAnL2JhdGNoLycgKyBiYXRjaElkICsgJy9yZXN1bHQnLFxuICAgICAgfSk7XG4gICAgICBsZXQgcmVzdWx0czogQnVsa0luZ2VzdEJhdGNoUmVzdWx0IHwgQnVsa1F1ZXJ5QmF0Y2hSZXN1bHQ7XG4gICAgICBpZiAoam9iLm9wZXJhdGlvbiA9PT0gJ3F1ZXJ5JyB8fCBqb2Iub3BlcmF0aW9uID09PSAncXVlcnlBbGwnKSB7XG4gICAgICAgIGNvbnN0IHJlcyA9IHJlc3AgYXMgQnVsa1F1ZXJ5UmVzdWx0UmVzcG9uc2U7XG4gICAgICAgIGxldCByZXN1bHRJZCA9IHJlc1sncmVzdWx0LWxpc3QnXS5yZXN1bHQ7XG4gICAgICAgIHJlc3VsdHMgPSAoQXJyYXkuaXNBcnJheShyZXN1bHRJZClcbiAgICAgICAgICA/IHJlc3VsdElkXG4gICAgICAgICAgOiBbcmVzdWx0SWRdXG4gICAgICAgICkubWFwKChpZCkgPT4gKHsgaWQsIGJhdGNoSWQsIGpvYklkIH0pKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHJlcyA9IHJlc3AgYXMgQnVsa0luZ2VzdFJlc3VsdFJlc3BvbnNlO1xuICAgICAgICByZXN1bHRzID0gcmVzLm1hcCgocmV0KSA9PiAoe1xuICAgICAgICAgIGlkOiByZXQuSWQgfHwgbnVsbCxcbiAgICAgICAgICBzdWNjZXNzOiByZXQuU3VjY2VzcyA9PT0gJ3RydWUnLFxuICAgICAgICAgIGVycm9yczogcmV0LkVycm9yID8gW3JldC5FcnJvcl0gOiBbXSxcbiAgICAgICAgfSkpO1xuICAgICAgfVxuICAgICAgdGhpcy5lbWl0KCdyZXNwb25zZScsIHJlc3VsdHMpO1xuICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRmV0Y2ggcXVlcnkgcmVzdWx0IGFzIGEgcmVjb3JkIHN0cmVhbVxuICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzdWx0SWQgLSBSZXN1bHQgaWRcbiAgICogQHJldHVybnMge1JlY29yZFN0cmVhbX0gLSBSZWNvcmQgc3RyZWFtLCBjb252ZXJ0aWJsZSB0byBDU1YgZGF0YSBzdHJlYW1cbiAgICovXG4gIHJlc3VsdChyZXN1bHRJZDogc3RyaW5nKSB7XG4gICAgY29uc3Qgam9iSWQgPSB0aGlzLmpvYi5pZDtcbiAgICBjb25zdCBiYXRjaElkID0gdGhpcy5pZDtcbiAgICBpZiAoIWpvYklkIHx8ICFiYXRjaElkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0JhdGNoIG5vdCBzdGFydGVkLicpO1xuICAgIH1cbiAgICBjb25zdCByZXN1bHRTdHJlYW0gPSBuZXcgUGFyc2FibGUoKTtcbiAgICBjb25zdCByZXN1bHREYXRhU3RyZWFtID0gcmVzdWx0U3RyZWFtLnN0cmVhbSgnY3N2Jyk7XG4gICAgdGhpcy5fYnVsa1xuICAgICAgLl9yZXF1ZXN0KHtcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgcGF0aDogJy9qb2IvJyArIGpvYklkICsgJy9iYXRjaC8nICsgYmF0Y2hJZCArICcvcmVzdWx0LycgKyByZXN1bHRJZCxcbiAgICAgICAgcmVzcG9uc2VUeXBlOiAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJyxcbiAgICAgIH0pXG4gICAgICAuc3RyZWFtKClcbiAgICAgIC5waXBlKHJlc3VsdERhdGFTdHJlYW0pO1xuICAgIHJldHVybiByZXN1bHRTdHJlYW07XG4gIH1cbn1cblxuLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG4vKipcbiAqXG4gKi9cbmNsYXNzIEJ1bGtBcGk8UyBleHRlbmRzIFNjaGVtYT4gZXh0ZW5kcyBIdHRwQXBpPFM+IHtcbiAgYmVmb3JlU2VuZChyZXF1ZXN0OiBIdHRwUmVxdWVzdCkge1xuICAgIHJlcXVlc3QuaGVhZGVycyA9IHtcbiAgICAgIC4uLnJlcXVlc3QuaGVhZGVycyxcbiAgICAgICdYLVNGREMtU0VTU0lPTic6IHRoaXMuX2Nvbm4uYWNjZXNzVG9rZW4gPz8gJycsXG4gICAgfTtcbiAgfVxuXG4gIGlzU2Vzc2lvbkV4cGlyZWQocmVzcG9uc2U6IEh0dHBSZXNwb25zZSkge1xuICAgIHJldHVybiAoXG4gICAgICByZXNwb25zZS5zdGF0dXNDb2RlID09PSA0MDAgJiZcbiAgICAgIC88ZXhjZXB0aW9uQ29kZT5JbnZhbGlkU2Vzc2lvbklkPFxcL2V4Y2VwdGlvbkNvZGU+Ly50ZXN0KHJlc3BvbnNlLmJvZHkpXG4gICAgKTtcbiAgfVxuXG4gIGhhc0Vycm9ySW5SZXNwb25zZUJvZHkoYm9keTogYW55KSB7XG4gICAgcmV0dXJuICEhYm9keS5lcnJvcjtcbiAgfVxuXG4gIHBhcnNlRXJyb3IoYm9keTogYW55KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yQ29kZTogYm9keS5lcnJvci5leGNlcHRpb25Db2RlLFxuICAgICAgbWVzc2FnZTogYm9keS5lcnJvci5leGNlcHRpb25NZXNzYWdlLFxuICAgIH07XG4gIH1cbn1cblxuY2xhc3MgQnVsa0FwaVYyPFMgZXh0ZW5kcyBTY2hlbWE+IGV4dGVuZHMgSHR0cEFwaTxTPiB7XG4gIGhhc0Vycm9ySW5SZXNwb25zZUJvZHkoYm9keTogYW55KSB7XG4gICAgcmV0dXJuIChcbiAgICAgIEFycmF5LmlzQXJyYXkoYm9keSkgJiZcbiAgICAgIHR5cGVvZiBib2R5WzBdID09PSAnb2JqZWN0JyAmJlxuICAgICAgJ2Vycm9yQ29kZScgaW4gYm9keVswXVxuICAgICk7XG4gIH1cblxuICBpc1Nlc3Npb25FeHBpcmVkKHJlc3BvbnNlOiBIdHRwUmVzcG9uc2UpOiBib29sZWFuIHtcbiAgICByZXR1cm4gKFxuICAgICAgcmVzcG9uc2Uuc3RhdHVzQ29kZSA9PT0gNDAxICYmIC9JTlZBTElEX1NFU1NJT05fSUQvLnRlc3QocmVzcG9uc2UuYm9keSlcbiAgICApO1xuICB9XG5cbiAgcGFyc2VFcnJvcihib2R5OiBhbnkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgZXJyb3JDb2RlOiBib2R5WzBdLmVycm9yQ29kZSxcbiAgICAgIG1lc3NhZ2U6IGJvZHlbMF0ubWVzc2FnZSxcbiAgICB9O1xuICB9XG59XG5cbi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4vKipcbiAqIENsYXNzIGZvciBCdWxrIEFQSVxuICpcbiAqIEBjbGFzc1xuICovXG5leHBvcnQgY2xhc3MgQnVsazxTIGV4dGVuZHMgU2NoZW1hPiB7XG4gIF9jb25uOiBDb25uZWN0aW9uPFM+O1xuICBfbG9nZ2VyOiBMb2dnZXI7XG5cbiAgLyoqXG4gICAqIFBvbGxpbmcgaW50ZXJ2YWwgaW4gbWlsbGlzZWNvbmRzXG4gICAqL1xuICBwb2xsSW50ZXJ2YWwgPSAxMDAwO1xuXG4gIC8qKlxuICAgKiBQb2xsaW5nIHRpbWVvdXQgaW4gbWlsbGlzZWNvbmRzXG4gICAqIEB0eXBlIHtOdW1iZXJ9XG4gICAqL1xuICBwb2xsVGltZW91dCA9IDEwMDAwO1xuXG4gIC8qKlxuICAgKlxuICAgKi9cbiAgY29uc3RydWN0b3IoY29ubjogQ29ubmVjdGlvbjxTPikge1xuICAgIHRoaXMuX2Nvbm4gPSBjb25uO1xuICAgIHRoaXMuX2xvZ2dlciA9IGNvbm4uX2xvZ2dlcjtcbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKi9cbiAgX3JlcXVlc3Q8VD4ocmVxdWVzdF86IEJ1bGtSZXF1ZXN0KSB7XG4gICAgY29uc3QgY29ubiA9IHRoaXMuX2Nvbm47XG4gICAgY29uc3QgeyBwYXRoLCByZXNwb25zZVR5cGUsIC4uLnJyZXEgfSA9IHJlcXVlc3RfO1xuICAgIGNvbnN0IGJhc2VVcmwgPSBbY29ubi5pbnN0YW5jZVVybCwgJ3NlcnZpY2VzL2FzeW5jJywgY29ubi52ZXJzaW9uXS5qb2luKFxuICAgICAgJy8nLFxuICAgICk7XG4gICAgY29uc3QgcmVxdWVzdCA9IHtcbiAgICAgIC4uLnJyZXEsXG4gICAgICB1cmw6IGJhc2VVcmwgKyBwYXRoLFxuICAgIH07XG4gICAgcmV0dXJuIG5ldyBCdWxrQXBpKHRoaXMuX2Nvbm4sIHsgcmVzcG9uc2VUeXBlIH0pLnJlcXVlc3Q8VD4ocmVxdWVzdCk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGFuZCBzdGFydCBidWxrbG9hZCBqb2IgYW5kIGJhdGNoXG4gICAqL1xuICBsb2FkPE9wciBleHRlbmRzIEJ1bGtPcGVyYXRpb24+KFxuICAgIHR5cGU6IHN0cmluZyxcbiAgICBvcGVyYXRpb246IE9wcixcbiAgICBpbnB1dD86IFJlY29yZFtdIHwgUmVhZGFibGUgfCBzdHJpbmcsXG4gICk6IEJhdGNoPFMsIE9wcj47XG4gIGxvYWQ8T3ByIGV4dGVuZHMgQnVsa09wZXJhdGlvbj4oXG4gICAgdHlwZTogc3RyaW5nLFxuICAgIG9wZXJhdGlvbjogT3ByLFxuICAgIG9wdGlvbnNPcklucHV0PzogQnVsa09wdGlvbnMgfCBSZWNvcmRbXSB8IFJlYWRhYmxlIHwgc3RyaW5nLFxuICAgIGlucHV0PzogUmVjb3JkW10gfCBSZWFkYWJsZSB8IHN0cmluZyxcbiAgKTogQmF0Y2g8UywgT3ByPjtcbiAgbG9hZDxPcHIgZXh0ZW5kcyBCdWxrT3BlcmF0aW9uPihcbiAgICB0eXBlOiBzdHJpbmcsXG4gICAgb3BlcmF0aW9uOiBPcHIsXG4gICAgb3B0aW9uc09ySW5wdXQ/OiBCdWxrT3B0aW9ucyB8IFJlY29yZFtdIHwgUmVhZGFibGUgfCBzdHJpbmcsXG4gICAgaW5wdXQ/OiBSZWNvcmRbXSB8IFJlYWRhYmxlIHwgc3RyaW5nLFxuICApIHtcbiAgICBsZXQgb3B0aW9uczogQnVsa09wdGlvbnMgPSB7fTtcbiAgICBpZiAoXG4gICAgICB0eXBlb2Ygb3B0aW9uc09ySW5wdXQgPT09ICdzdHJpbmcnIHx8XG4gICAgICBBcnJheS5pc0FycmF5KG9wdGlvbnNPcklucHV0KSB8fFxuICAgICAgKGlzT2JqZWN0KG9wdGlvbnNPcklucHV0KSAmJlxuICAgICAgICAncGlwZScgaW4gb3B0aW9uc09ySW5wdXQgJiZcbiAgICAgICAgdHlwZW9mIG9wdGlvbnNPcklucHV0LnBpcGUgPT09ICdmdW5jdGlvbicpXG4gICAgKSB7XG4gICAgICAvLyB3aGVuIG9wdGlvbnMgaXMgbm90IHBsYWluIGhhc2ggb2JqZWN0LCBpdCBpcyBvbWl0dGVkXG4gICAgICBpbnB1dCA9IG9wdGlvbnNPcklucHV0O1xuICAgIH0gZWxzZSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9uc09ySW5wdXQgYXMgQnVsa09wdGlvbnM7XG4gICAgfVxuICAgIGNvbnN0IGpvYiA9IHRoaXMuY3JlYXRlSm9iKHR5cGUsIG9wZXJhdGlvbiwgb3B0aW9ucyk7XG4gICAgY29uc3QgYmF0Y2ggPSBqb2IuY3JlYXRlQmF0Y2goKTtcbiAgICBjb25zdCBjbGVhbnVwID0gKCkgPT4gam9iLmNsb3NlKCk7XG4gICAgY29uc3QgY2xlYW51cE9uRXJyb3IgPSAoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgaWYgKGVyci5uYW1lICE9PSAnUG9sbGluZ1RpbWVvdXQnKSB7XG4gICAgICAgIGNsZWFudXAoKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGJhdGNoLm9uKCdyZXNwb25zZScsIGNsZWFudXApO1xuICAgIGJhdGNoLm9uKCdlcnJvcicsIGNsZWFudXBPbkVycm9yKTtcbiAgICBiYXRjaC5vbigncXVldWUnLCAoKSA9PiB7XG4gICAgICBiYXRjaD8ucG9sbCh0aGlzLnBvbGxJbnRlcnZhbCwgdGhpcy5wb2xsVGltZW91dCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGJhdGNoLmV4ZWN1dGUoaW5wdXQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4ZWN1dGUgYnVsayBxdWVyeSBhbmQgZ2V0IHJlY29yZCBzdHJlYW1cbiAgICovXG4gIHF1ZXJ5KHNvcWw6IHN0cmluZykge1xuICAgIGNvbnN0IG0gPSBzb3FsLnJlcGxhY2UoL1xcKFtcXHNcXFNdK1xcKS9nLCAnJykubWF0Y2goL0ZST01cXHMrKFxcdyspL2kpO1xuICAgIGlmICghbSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnTm8gc29iamVjdCB0eXBlIGZvdW5kIGluIHF1ZXJ5LCBtYXliZSBjYXVzZWQgYnkgaW52YWxpZCBTT1FMLicsXG4gICAgICApO1xuICAgIH1cbiAgICBjb25zdCB0eXBlID0gbVsxXTtcbiAgICBjb25zdCByZWNvcmRTdHJlYW0gPSBuZXcgUGFyc2FibGUoKTtcbiAgICBjb25zdCBkYXRhU3RyZWFtID0gcmVjb3JkU3RyZWFtLnN0cmVhbSgnY3N2Jyk7XG4gICAgKGFzeW5jICgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCB0aGlzLmxvYWQodHlwZSwgJ3F1ZXJ5Jywgc29xbCk7XG4gICAgICAgIGNvbnN0IHN0cmVhbXMgPSByZXN1bHRzLm1hcCgocmVzdWx0KSA9PlxuICAgICAgICAgIHRoaXMuam9iKHJlc3VsdC5qb2JJZClcbiAgICAgICAgICAgIC5iYXRjaChyZXN1bHQuYmF0Y2hJZClcbiAgICAgICAgICAgIC5yZXN1bHQocmVzdWx0LmlkKVxuICAgICAgICAgICAgLnN0cmVhbSgpLFxuICAgICAgICApO1xuICAgICAgICBqb2luU3RyZWFtcyhzdHJlYW1zKS5waXBlKGRhdGFTdHJlYW0pO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHJlY29yZFN0cmVhbS5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgICB9XG4gICAgfSkoKTtcbiAgICByZXR1cm4gcmVjb3JkU3RyZWFtO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBqb2IgaW5zdGFuY2VcbiAgICovXG4gIGNyZWF0ZUpvYjxPcHIgZXh0ZW5kcyBCdWxrT3BlcmF0aW9uPihcbiAgICB0eXBlOiBzdHJpbmcsXG4gICAgb3BlcmF0aW9uOiBPcHIsXG4gICAgb3B0aW9uczogQnVsa09wdGlvbnMgPSB7fSxcbiAgKSB7XG4gICAgcmV0dXJuIG5ldyBKb2IodGhpcywgdHlwZSwgb3BlcmF0aW9uLCBvcHRpb25zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYSBqb2IgaW5zdGFuY2Ugc3BlY2lmaWVkIGJ5IGdpdmVuIGpvYiBJRFxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gam9iSWQgLSBKb2IgSURcbiAgICogQHJldHVybnMge0J1bGt+Sm9ifVxuICAgKi9cbiAgam9iPE9wciBleHRlbmRzIEJ1bGtPcGVyYXRpb24+KGpvYklkOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gbmV3IEpvYjxTLCBPcHI+KHRoaXMsIG51bGwsIG51bGwsIG51bGwsIGpvYklkKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgQnVsa1YyPFMgZXh0ZW5kcyBTY2hlbWE+IHtcbiAgI2Nvbm5lY3Rpb246IENvbm5lY3Rpb248Uz47XG5cbiAgLyoqXG4gICAqIFBvbGxpbmcgaW50ZXJ2YWwgaW4gbWlsbGlzZWNvbmRzXG4gICAqL1xuICBwb2xsSW50ZXJ2YWwgPSAxMDAwO1xuXG4gIC8qKlxuICAgKiBQb2xsaW5nIHRpbWVvdXQgaW4gbWlsbGlzZWNvbmRzXG4gICAqIEB0eXBlIHtOdW1iZXJ9XG4gICAqL1xuICBwb2xsVGltZW91dCA9IDEwMDAwO1xuXG4gIGNvbnN0cnVjdG9yKGNvbm5lY3Rpb246IENvbm5lY3Rpb248Uz4pIHtcbiAgICB0aGlzLiNjb25uZWN0aW9uID0gY29ubmVjdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW4gaW5zdGFuY2Ugb2YgYW4gaW5nZXN0IGpvYiBvYmplY3QuXG4gICAqXG4gICAqIEBwYXJhbXMge05ld0luZ2VzdEpvYk9wdGlvbnN9IG9wdGlvbnMgb2JqZWN0XG4gICAqIEByZXR1cm5zIHtJbmdlc3RKb2JWMn0gQW4gaW5nZXN0IGpvYiBpbnN0YW5jZVxuICAgKiBAZXhhbXBsZVxuICAgKiAvLyBVcHNlcnQgcmVjb3JkcyB0byB0aGUgQWNjb3VudCBvYmplY3QuXG4gICAqXG4gICAqIGNvbnN0IGpvYiA9IGNvbm5lY3Rpb24uYnVsazIuY3JlYXRlSm9iKHtcbiAgICogICBvcGVyYXRpb246ICdpbnNlcnQnXG4gICAqICAgb2JqZWN0OiAnQWNjb3VudCcsXG4gICAqIH0pO1xuICAgKlxuICAgKiAvLyBjcmVhdGUgdGhlIGpvYiBpbiB0aGUgb3JnXG4gICAqIGF3YWl0IGpvYi5vcGVuKClcbiAgICpcbiAgICogLy8gdXBsb2FkIGRhdGFcbiAgICogYXdhaXQgam9iLnVwbG9hZERhdGEoY3N2RmlsZSlcbiAgICpcbiAgICogLy8gZmluaXNoZWQgdXBsb2FkaW5nIGRhdGEsIG1hcmsgaXQgYXMgcmVhZHkgZm9yIHByb2Nlc3NpbmdcbiAgICogYXdhaXQgam9iLmNsb3NlKClcbiAgICovXG4gIGNyZWF0ZUpvYjxPcHIgZXh0ZW5kcyBJbmdlc3RPcGVyYXRpb24+KFxuICAgIG9wdGlvbnM6IE5ld0luZ2VzdEpvYk9wdGlvbnMsXG4gICk6IEluZ2VzdEpvYlYyPFMsIE9wcj4ge1xuICAgIHJldHVybiBuZXcgSW5nZXN0Sm9iVjIoe1xuICAgICAgY29ubmVjdGlvbjogdGhpcy4jY29ubmVjdGlvbixcbiAgICAgIGpvYkluZm86IG9wdGlvbnMsXG4gICAgICBwb2xsaW5nT3B0aW9uczogdGhpcyxcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYSBpbmdlc3Qgam9iIGluc3RhbmNlIHNwZWNpZmllZCBieSBhIGdpdmVuIGpvYiBJRFxuICAgKlxuICAgKiBAcGFyYW0gb3B0aW9ucyBPcHRpb25zIG9iamVjdCB3aXRoIGEgam9iIElEXG4gICAqIEByZXR1cm5zIEluZ2VzdEpvYlYyIEFuIGluZ2VzdCBqb2JcbiAgICovXG4gIGpvYjxPcHIgZXh0ZW5kcyBJbmdlc3RPcGVyYXRpb24+KFxuICAgIG9wdGlvbnM6IEV4aXN0aW5nSW5nZXN0Sm9iT3B0aW9ucyxcbiAgKTogSW5nZXN0Sm9iVjI8UywgT3ByPiB7XG4gICAgcmV0dXJuIG5ldyBJbmdlc3RKb2JWMih7XG4gICAgICBjb25uZWN0aW9uOiB0aGlzLiNjb25uZWN0aW9uLFxuICAgICAgam9iSW5mbzogb3B0aW9ucyxcbiAgICAgIHBvbGxpbmdPcHRpb25zOiB0aGlzLFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSwgdXBsb2FkLCBhbmQgc3RhcnQgYnVsa2xvYWQgam9iXG4gICAqL1xuICBhc3luYyBsb2FkQW5kV2FpdEZvclJlc3VsdHMoXG4gICAgb3B0aW9uczogTmV3SW5nZXN0Sm9iT3B0aW9ucyAmXG4gICAgICBQYXJ0aWFsPEJ1bGtWMlBvbGxpbmdPcHRpb25zPiAmIHtcbiAgICAgICAgaW5wdXQ6IFJlY29yZFtdIHwgUmVhZGFibGUgfCBzdHJpbmc7XG4gICAgICB9LFxuICApOiBQcm9taXNlPEluZ2VzdEpvYlYyUmVzdWx0czxTPj4ge1xuICAgIGlmICghb3B0aW9ucy5wb2xsVGltZW91dCkgb3B0aW9ucy5wb2xsVGltZW91dCA9IHRoaXMucG9sbFRpbWVvdXQ7XG4gICAgaWYgKCFvcHRpb25zLnBvbGxJbnRlcnZhbCkgb3B0aW9ucy5wb2xsSW50ZXJ2YWwgPSB0aGlzLnBvbGxJbnRlcnZhbDtcblxuICAgIGNvbnN0IGpvYiA9IHRoaXMuY3JlYXRlSm9iKG9wdGlvbnMpO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBqb2Iub3BlbigpO1xuICAgICAgYXdhaXQgam9iLnVwbG9hZERhdGEob3B0aW9ucy5pbnB1dCk7XG4gICAgICBhd2FpdCBqb2IuY2xvc2UoKTtcbiAgICAgIGF3YWl0IGpvYi5wb2xsKG9wdGlvbnMucG9sbEludGVydmFsLCBvcHRpb25zLnBvbGxUaW1lb3V0KTtcbiAgICAgIHJldHVybiBhd2FpdCBqb2IuZ2V0QWxsUmVzdWx0cygpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgaWYgKGVyci5uYW1lICE9PSAnSm9iUG9sbGluZ1RpbWVvdXRFcnJvcicpIHtcbiAgICAgICAgLy8gZmlyZXMgb2ZmIG9uZSBsYXN0IGF0dGVtcHQgdG8gY2xlYW4gdXAgYW5kIGlnbm9yZXMgdGhlIHJlc3VsdCB8IGVycm9yXG4gICAgICAgIGpvYi5kZWxldGUoKS5jYXRjaCgoaWdub3JlZCkgPT4gaWdub3JlZCk7XG4gICAgICB9XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEV4ZWN1dGUgYnVsayBxdWVyeSBhbmQgZ2V0IHJlY29yZHNcbiAgICpcbiAgICogRGVmYXVsdCB0aW1lb3V0OiAxMDAwMG1zXG4gICAqXG4gICAqIEBwYXJhbSBzb3FsIFNPUUwgcXVlcnlcbiAgICogQHBhcmFtIEJ1bGtWMlBvbGxpbmdPcHRpb25zIG9wdGlvbnMgb2JqZWN0XG4gICAqXG4gICAqIEByZXR1cm5zIFJlY29yZFtdXG4gICAqL1xuICBhc3luYyBxdWVyeShcbiAgICBzb3FsOiBzdHJpbmcsXG4gICAgb3B0aW9ucz86IFBhcnRpYWw8QnVsa1YyUG9sbGluZ09wdGlvbnM+ICYge1xuICAgICAgc2NhbkFsbD86IGJvb2xlYW47XG4gICAgICB0b29saW5nPzogYm9vbGVhbjtcbiAgICB9LFxuICApOiBQcm9taXNlPFJlY29yZFtdPiB7XG4gICAgY29uc3QgcXVlcnlKb2IgPSBuZXcgUXVlcnlKb2JWMih7XG4gICAgICBjb25uZWN0aW9uOiB0aGlzLiNjb25uZWN0aW9uLFxuICAgICAgb3BlcmF0aW9uOiBvcHRpb25zPy5zY2FuQWxsID8gJ3F1ZXJ5QWxsJyA6ICdxdWVyeScsXG4gICAgICBxdWVyeTogc29xbCxcbiAgICAgIHBvbGxpbmdPcHRpb25zOiB0aGlzLFxuICAgICAgdG9vbGluZzogb3B0aW9ucz8udG9vbGluZyB8fCBmYWxzZSxcbiAgICB9KTtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgcXVlcnlKb2Iub3BlbigpO1xuICAgICAgYXdhaXQgcXVlcnlKb2IucG9sbChvcHRpb25zPy5wb2xsSW50ZXJ2YWwsIG9wdGlvbnM/LnBvbGxUaW1lb3V0KTtcbiAgICAgIHJldHVybiBhd2FpdCBxdWVyeUpvYi5nZXRSZXN1bHRzKCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAoZXJyLm5hbWUgIT09ICdKb2JQb2xsaW5nVGltZW91dEVycm9yJykge1xuICAgICAgICAvLyBmaXJlcyBvZmYgb25lIGxhc3QgYXR0ZW1wdCB0byBjbGVhbiB1cCBhbmQgaWdub3JlcyB0aGUgcmVzdWx0IHwgZXJyb3JcbiAgICAgICAgcXVlcnlKb2IuZGVsZXRlKCkuY2F0Y2goKGlnbm9yZWQpID0+IGlnbm9yZWQpO1xuICAgICAgfVxuICAgICAgdGhyb3cgZXJyO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgUXVlcnlKb2JWMjxTIGV4dGVuZHMgU2NoZW1hPiBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIHJlYWRvbmx5ICNjb25uZWN0aW9uOiBDb25uZWN0aW9uPFM+O1xuICByZWFkb25seSAjb3BlcmF0aW9uOiBRdWVyeU9wZXJhdGlvbjtcbiAgcmVhZG9ubHkgI3F1ZXJ5OiBzdHJpbmc7XG4gIHJlYWRvbmx5ICNwb2xsaW5nT3B0aW9uczogQnVsa1YyUG9sbGluZ09wdGlvbnM7XG4gIHJlYWRvbmx5ICN0b29saW5nOiBib29sZWFuO1xuICAjcXVlcnlSZXN1bHRzOiBSZWNvcmRbXSB8IHVuZGVmaW5lZDtcbiAgI2Vycm9yOiBFcnJvciB8IHVuZGVmaW5lZDtcbiAgam9iSW5mbzogUGFydGlhbDxKb2JJbmZvVjI+IHwgdW5kZWZpbmVkO1xuICBsb2NhdG9yOiBPcHRpb25hbDxzdHJpbmc+O1xuICBmaW5pc2hlZDogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnM6IENyZWF0ZVF1ZXJ5Sm9iVjJPcHRpb25zPFM+KSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLiNjb25uZWN0aW9uID0gb3B0aW9ucy5jb25uZWN0aW9uO1xuICAgIHRoaXMuI29wZXJhdGlvbiA9IG9wdGlvbnMub3BlcmF0aW9uO1xuICAgIHRoaXMuI3F1ZXJ5ID0gb3B0aW9ucy5xdWVyeTtcbiAgICB0aGlzLiNwb2xsaW5nT3B0aW9ucyA9IG9wdGlvbnMucG9sbGluZ09wdGlvbnM7XG4gICAgdGhpcy4jdG9vbGluZyA9IG9wdGlvbnMudG9vbGluZztcbiAgICAvLyBkZWZhdWx0IGVycm9yIGhhbmRsZXIgdG8ga2VlcCB0aGUgbGF0ZXN0IGVycm9yXG4gICAgdGhpcy5vbignZXJyb3InLCAoZXJyb3IpID0+ICh0aGlzLiNlcnJvciA9IGVycm9yKSk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIHF1ZXJ5IGpvYlxuICAgKi9cbiAgYXN5bmMgb3BlbigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgdGhpcy5qb2JJbmZvID0gYXdhaXQgdGhpcy5jcmVhdGVRdWVyeVJlcXVlc3Q8Sm9iSW5mb1YyPih7XG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICBwYXRoOiAnJyxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIG9wZXJhdGlvbjogdGhpcy4jb3BlcmF0aW9uLFxuICAgICAgICAgIHF1ZXJ5OiB0aGlzLiNxdWVyeSxcbiAgICAgICAgfSksXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLTgnLFxuICAgICAgICB9LFxuICAgICAgICByZXNwb25zZVR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgIH0pO1xuICAgICAgdGhpcy5lbWl0KCdvcGVuJyk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2V0IHRoZSBzdGF0dXMgdG8gYWJvcnRcbiAgICovXG4gIGFzeW5jIGFib3J0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdGF0ZTogSm9iU3RhdGVWMiA9ICdBYm9ydGVkJztcbiAgICAgIHRoaXMuam9iSW5mbyA9IGF3YWl0IHRoaXMuY3JlYXRlUXVlcnlSZXF1ZXN0PEpvYkluZm9WMj4oe1xuICAgICAgICBtZXRob2Q6ICdQQVRDSCcsXG4gICAgICAgIHBhdGg6IGAvJHt0aGlzLmpvYkluZm8/LmlkfWAsXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgc3RhdGUgfSksXG4gICAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PXV0Zi04JyB9LFxuICAgICAgICByZXNwb25zZVR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgIH0pO1xuICAgICAgdGhpcy5lbWl0KCdhYm9ydGVkJyk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUG9sbCBmb3IgdGhlIHN0YXRlIG9mIHRoZSBwcm9jZXNzaW5nIGZvciB0aGUgam9iLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCB3aWxsIG9ubHkgdGhyb3cgYWZ0ZXIgYSB0aW1lb3V0LiBUbyBjYXB0dXJlIGFcbiAgICogam9iIGZhaWx1cmUgd2hpbGUgcG9sbGluZyB5b3UgbXVzdCBzZXQgYSBsaXN0ZW5lciBmb3IgdGhlXG4gICAqIGBmYWlsZWRgIGV2ZW50IGJlZm9yZSBjYWxsaW5nIGl0OlxuICAgKlxuICAgKiBqb2Iub24oJ2ZhaWxlZCcsIChlcnIpID0+IGNvbnNvbGUuZXJyb3IoZXJyKSlcbiAgICogYXdhaXQgam9iLnBvbGwoKVxuICAgKlxuICAgKiBAcGFyYW0gaW50ZXJ2YWwgUG9sbGluZyBpbnRlcnZhbCBpbiBtaWxsaXNlY29uZHNcbiAgICogQHBhcmFtIHRpbWVvdXQgUG9sbGluZyB0aW1lb3V0IGluIG1pbGxpc2Vjb25kc1xuICAgKiBAcmV0dXJucyB7UHJvbWlzZTxSZWNvcmRbXT59IEEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvIGFuIGFycmF5IG9mIHJlY29yZHNcbiAgICovXG4gIGFzeW5jIHBvbGwoXG4gICAgaW50ZXJ2YWw6IG51bWJlciA9IHRoaXMuI3BvbGxpbmdPcHRpb25zLnBvbGxJbnRlcnZhbCxcbiAgICB0aW1lb3V0OiBudW1iZXIgPSB0aGlzLiNwb2xsaW5nT3B0aW9ucy5wb2xsVGltZW91dCxcbiAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3Qgam9iSWQgPSBnZXRKb2JJZE9yRXJyb3IodGhpcy5qb2JJbmZvKTtcbiAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuXG4gICAgd2hpbGUgKHN0YXJ0VGltZSArIHRpbWVvdXQgPiBEYXRlLm5vdygpKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZXMgPSBhd2FpdCB0aGlzLmNoZWNrKCk7XG4gICAgICAgIHN3aXRjaCAocmVzLnN0YXRlKSB7XG4gICAgICAgICAgY2FzZSAnT3Blbic6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0pvYiBoYXMgbm90IGJlZW4gc3RhcnRlZCcpO1xuICAgICAgICAgIGNhc2UgJ0Fib3J0ZWQnOlxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdKb2IgaGFzIGJlZW4gYWJvcnRlZCcpO1xuICAgICAgICAgIGNhc2UgJ1VwbG9hZENvbXBsZXRlJzpcbiAgICAgICAgICBjYXNlICdJblByb2dyZXNzJzpcbiAgICAgICAgICAgIGF3YWl0IGRlbGF5KGludGVydmFsKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ0ZhaWxlZCc6XG4gICAgICAgICAgICAvLyB1bmxpa2UgaW5nZXN0IGpvYnMsIHRoZSBBUEkgZG9lc24ndCByZXR1cm4gYW4gZXJyb3IgbXNnOlxuICAgICAgICAgICAgLy8gaHR0cHM6Ly9kZXZlbG9wZXIuc2FsZXNmb3JjZS5jb20vZG9jcy9hdGxhcy5lbi11cy5hcGlfYXN5bmNoLm1ldGEvYXBpX2FzeW5jaC9xdWVyeV9nZXRfb25lX2pvYi5odG1cbiAgICAgICAgICAgIHRoaXMuZW1pdCgnZmFpbGVkJywgbmV3IEVycm9yKCdRdWVyeSBqb2IgZmFpbGVkIHRvIGNvbXBsZXRlLicpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICBjYXNlICdKb2JDb21wbGV0ZSc6XG4gICAgICAgICAgICB0aGlzLmVtaXQoJ2pvYmNvbXBsZXRlJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICB0aGlzLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHRpbWVvdXRFcnJvciA9IG5ldyBKb2JQb2xsaW5nVGltZW91dEVycm9yKFxuICAgICAgYFBvbGxpbmcgdGltZWQgb3V0IGFmdGVyICR7dGltZW91dH1tcy4gSm9iIElkID0gJHtqb2JJZH1gLFxuICAgICAgam9iSWQsXG4gICAgKTtcbiAgICB0aGlzLmVtaXQoJ2Vycm9yJywgdGltZW91dEVycm9yKTtcbiAgICB0aHJvdyB0aW1lb3V0RXJyb3I7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgdGhlIGxhdGVzdCBiYXRjaCBzdGF0dXMgaW4gc2VydmVyXG4gICAqL1xuICBhc3luYyBjaGVjaygpOiBQcm9taXNlPEpvYkluZm9WMj4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBqb2JJbmZvID0gYXdhaXQgdGhpcy5jcmVhdGVRdWVyeVJlcXVlc3Q8Sm9iSW5mb1YyPih7XG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIHBhdGg6IGAvJHtnZXRKb2JJZE9yRXJyb3IodGhpcy5qb2JJbmZvKX1gLFxuICAgICAgICByZXNwb25zZVR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgIH0pO1xuICAgICAgdGhpcy5qb2JJbmZvID0gam9iSW5mbztcbiAgICAgIHJldHVybiBqb2JJbmZvO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZXF1ZXN0PFIgPSB1bmtub3duPihcbiAgICByZXF1ZXN0OiBzdHJpbmcgfCBIdHRwUmVxdWVzdCxcbiAgICBvcHRpb25zOiBPYmplY3QgPSB7fSxcbiAgKTogU3RyZWFtUHJvbWlzZTxSPiB7XG4gICAgLy8gaWYgcmVxdWVzdCBpcyBzaW1wbGUgc3RyaW5nLCByZWdhcmQgaXQgYXMgdXJsIGluIEdFVCBtZXRob2RcbiAgICBsZXQgcmVxdWVzdF86IEh0dHBSZXF1ZXN0ID1cbiAgICAgIHR5cGVvZiByZXF1ZXN0ID09PSAnc3RyaW5nJyA/IHsgbWV0aG9kOiAnR0VUJywgdXJsOiByZXF1ZXN0IH0gOiByZXF1ZXN0O1xuXG4gICAgY29uc3QgaHR0cEFwaSA9IG5ldyBIdHRwQXBpKHRoaXMuI2Nvbm5lY3Rpb24sIG9wdGlvbnMpO1xuICAgIGh0dHBBcGkub24oJ3Jlc3BvbnNlJywgKHJlc3BvbnNlOiBIdHRwUmVzcG9uc2UpID0+IHtcbiAgICAgIHRoaXMubG9jYXRvciA9IHJlc3BvbnNlLmhlYWRlcnNbJ3Nmb3JjZS1sb2NhdG9yJ107XG4gICAgfSk7XG4gICAgcmV0dXJuIGh0dHBBcGkucmVxdWVzdDxSPihyZXF1ZXN0Xyk7XG4gIH1cblxuICBwcml2YXRlIGdldFJlc3VsdHNVcmwoKTogc3RyaW5nIHtcbiAgICBjb25zdCB1cmwgPSBgJHt0aGlzLiNjb25uZWN0aW9uLmluc3RhbmNlVXJsfS9zZXJ2aWNlcy9kYXRhL3Yke3RoaXMuI2Nvbm5lY3Rpb24udmVyc2lvblxuICAgICAgfSR7dGhpcy4jdG9vbGluZyA/ICcvdG9vbGluZycgOiAnJ30vam9icy9xdWVyeS8ke2dldEpvYklkT3JFcnJvcih0aGlzLmpvYkluZm8pfS9yZXN1bHRzYDtcblxuICAgIHJldHVybiB0aGlzLmxvY2F0b3IgPyBgJHt1cmx9P2xvY2F0b3I9JHt0aGlzLmxvY2F0b3J9YCA6IHVybDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHJlc3VsdHMgZm9yIGEgcXVlcnkgam9iLlxuICAgKlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZTxSZWNvcmRbXT59IEEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvIGFuIGFycmF5IG9mIHJlY29yZHNcbiAgICovXG4gIGFzeW5jIGdldFJlc3VsdHMoKTogUHJvbWlzZTxSZWNvcmRbXT4ge1xuICAgIGlmICh0aGlzLmZpbmlzaGVkICYmIHRoaXMuI3F1ZXJ5UmVzdWx0cykge1xuICAgICAgcmV0dXJuIHRoaXMuI3F1ZXJ5UmVzdWx0cztcbiAgICB9XG5cbiAgICB0aGlzLiNxdWVyeVJlc3VsdHMgPSBbXTtcblxuICAgIHdoaWxlICh0aGlzLmxvY2F0b3IgIT09ICdudWxsJykge1xuICAgICAgY29uc3QgbmV4dFJlc3VsdHMgPSBhd2FpdCB0aGlzLnJlcXVlc3Q8UmVjb3JkW10+KHtcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgdXJsOiB0aGlzLmdldFJlc3VsdHNVcmwoKSxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIEFjY2VwdDogJ3RleHQvY3N2JyxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLiNxdWVyeVJlc3VsdHMgPSB0aGlzLiNxdWVyeVJlc3VsdHMuY29uY2F0KG5leHRSZXN1bHRzKTtcbiAgICB9XG4gICAgdGhpcy5maW5pc2hlZCA9IHRydWU7XG5cbiAgICByZXR1cm4gdGhpcy4jcXVlcnlSZXN1bHRzO1xuICB9XG5cbiAgLyoqXG4gICAqIERlbGV0ZXMgYSBxdWVyeSBqb2IuXG4gICAqL1xuICBhc3luYyBkZWxldGUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIHRoaXMuY3JlYXRlUXVlcnlSZXF1ZXN0PHZvaWQ+KHtcbiAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICBwYXRoOiBgLyR7Z2V0Sm9iSWRPckVycm9yKHRoaXMuam9iSW5mbyl9YCxcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlUXVlcnlSZXF1ZXN0PFQ+KHJlcXVlc3Q6IEJ1bGtSZXF1ZXN0KSB7XG4gICAgY29uc3QgeyBwYXRoLCByZXNwb25zZVR5cGUgfSA9IHJlcXVlc3Q7XG4gICAgY29uc3QgYmFzZVVybCA9IFtcbiAgICAgIHRoaXMuI2Nvbm5lY3Rpb24uaW5zdGFuY2VVcmwsXG4gICAgICAnc2VydmljZXMvZGF0YScsXG4gICAgICBgdiR7dGhpcy4jY29ubmVjdGlvbi52ZXJzaW9ufWAsXG4gICAgICAuLi4odGhpcy4jdG9vbGluZyA/IFsndG9vbGluZyddIDogW10pLFxuICAgICAgJ2pvYnMvcXVlcnknLFxuICAgIF0uam9pbignLycpO1xuXG4gICAgcmV0dXJuIG5ldyBCdWxrQXBpVjIodGhpcy4jY29ubmVjdGlvbiwgeyByZXNwb25zZVR5cGUgfSkucmVxdWVzdDxUPih7XG4gICAgICAuLi5yZXF1ZXN0LFxuICAgICAgdXJsOiBiYXNlVXJsICsgcGF0aCxcbiAgICB9KTtcbiAgfVxufVxuXG4vKipcbiAqIENsYXNzIGZvciBCdWxrIEFQSSBWMiBJbmdlc3QgSm9iXG4gKi9cbmV4cG9ydCBjbGFzcyBJbmdlc3RKb2JWMjxcbiAgUyBleHRlbmRzIFNjaGVtYSxcbiAgT3ByIGV4dGVuZHMgSW5nZXN0T3BlcmF0aW9uXG4+IGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgcmVhZG9ubHkgI2Nvbm5lY3Rpb246IENvbm5lY3Rpb248Uz47XG4gIHJlYWRvbmx5ICNwb2xsaW5nT3B0aW9uczogQnVsa1YyUG9sbGluZ09wdGlvbnM7XG4gIHJlYWRvbmx5ICNqb2JEYXRhOiBKb2JEYXRhVjI8UywgT3ByPjtcbiAgI2J1bGtKb2JTdWNjZXNzZnVsUmVzdWx0czogSW5nZXN0Sm9iVjJTdWNjZXNzZnVsUmVzdWx0czxTPiB8IHVuZGVmaW5lZDtcbiAgI2J1bGtKb2JGYWlsZWRSZXN1bHRzOiBJbmdlc3RKb2JWMkZhaWxlZFJlc3VsdHM8Uz4gfCB1bmRlZmluZWQ7XG4gICNidWxrSm9iVW5wcm9jZXNzZWRSZWNvcmRzOiBJbmdlc3RKb2JWMlVucHJvY2Vzc2VkUmVjb3JkczxTPiB8IHVuZGVmaW5lZDtcbiAgI2Vycm9yOiBFcnJvciB8IHVuZGVmaW5lZDtcbiAgam9iSW5mbzogUGFydGlhbDxKb2JJbmZvVjI+O1xuXG4gIC8qKlxuICAgKlxuICAgKi9cbiAgY29uc3RydWN0b3Iob3B0aW9uczogQ3JlYXRlSW5nZXN0Sm9iVjJPcHRpb25zPFM+KSB7XG4gICAgc3VwZXIoKTtcblxuICAgIHRoaXMuI2Nvbm5lY3Rpb24gPSBvcHRpb25zLmNvbm5lY3Rpb247XG4gICAgdGhpcy4jcG9sbGluZ09wdGlvbnMgPSBvcHRpb25zLnBvbGxpbmdPcHRpb25zO1xuICAgIHRoaXMuam9iSW5mbyA9IG9wdGlvbnMuam9iSW5mbztcbiAgICB0aGlzLiNqb2JEYXRhID0gbmV3IEpvYkRhdGFWMjxTLCBPcHI+KHtcbiAgICAgIGNyZWF0ZVJlcXVlc3Q6IChyZXF1ZXN0KSA9PiB0aGlzLmNyZWF0ZUluZ2VzdFJlcXVlc3QocmVxdWVzdCksXG4gICAgICBqb2I6IHRoaXMsXG4gICAgfSk7XG4gICAgLy8gZGVmYXVsdCBlcnJvciBoYW5kbGVyIHRvIGtlZXAgdGhlIGxhdGVzdCBlcnJvclxuICAgIHRoaXMub24oJ2Vycm9yJywgKGVycm9yKSA9PiAodGhpcy4jZXJyb3IgPSBlcnJvcikpO1xuICB9XG5cbiAgZ2V0IGlkKCkge1xuICAgIHJldHVybiB0aGlzLmpvYkluZm8uaWQ7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGEgam9iIHJlcHJlc2VudGluZyBhIGJ1bGsgb3BlcmF0aW9uIGluIHRoZSBvcmdcbiAgICovXG4gIGFzeW5jIG9wZW4oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMuam9iSW5mbyA9IGF3YWl0IHRoaXMuY3JlYXRlSW5nZXN0UmVxdWVzdDxKb2JJbmZvVjI+KHtcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgIHBhdGg6ICcnLFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgYXNzaWdubWVudFJ1bGVJZDogdGhpcy5qb2JJbmZvPy5hc3NpZ25tZW50UnVsZUlkLFxuICAgICAgICAgIGV4dGVybmFsSWRGaWVsZE5hbWU6IHRoaXMuam9iSW5mbz8uZXh0ZXJuYWxJZEZpZWxkTmFtZSxcbiAgICAgICAgICBvYmplY3Q6IHRoaXMuam9iSW5mbz8ub2JqZWN0LFxuICAgICAgICAgIG9wZXJhdGlvbjogdGhpcy5qb2JJbmZvPy5vcGVyYXRpb24sXG4gICAgICAgICAgbGluZUVuZGluZzogdGhpcy5qb2JJbmZvPy5saW5lRW5kaW5nLFxuICAgICAgICB9KSxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOCcsXG4gICAgICAgIH0sXG4gICAgICAgIHJlc3BvbnNlVHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgfSk7XG4gICAgICB0aGlzLmVtaXQoJ29wZW4nKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRoaXMuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgICAgdGhyb3cgZXJyO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBVcGxvYWQgZGF0YSBmb3IgYSBqb2IgaW4gQ1NWIGZvcm1hdFxuICAgKlxuICAgKiAgQHBhcmFtIGlucHV0IENTViBhcyBhIHN0cmluZywgb3IgYXJyYXkgb2YgcmVjb3JkcyBvciByZWFkYWJsZSBzdHJlYW1cbiAgICovXG4gIGFzeW5jIHVwbG9hZERhdGEoaW5wdXQ6IHN0cmluZyB8IFJlY29yZFtdIHwgUmVhZGFibGUpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLiNqb2JEYXRhLmV4ZWN1dGUoaW5wdXQpO1xuICB9XG5cbiAgYXN5bmMgZ2V0QWxsUmVzdWx0cygpOiBQcm9taXNlPEluZ2VzdEpvYlYyUmVzdWx0czxTPj4ge1xuICAgIGNvbnN0IFtcbiAgICAgIHN1Y2Nlc3NmdWxSZXN1bHRzLFxuICAgICAgZmFpbGVkUmVzdWx0cyxcbiAgICAgIHVucHJvY2Vzc2VkUmVjb3JkcyxcbiAgICBdID0gYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgICAgdGhpcy5nZXRTdWNjZXNzZnVsUmVzdWx0cygpLFxuICAgICAgdGhpcy5nZXRGYWlsZWRSZXN1bHRzKCksXG4gICAgICB0aGlzLmdldFVucHJvY2Vzc2VkUmVjb3JkcygpLFxuICAgIF0pO1xuICAgIHJldHVybiB7IHN1Y2Nlc3NmdWxSZXN1bHRzLCBmYWlsZWRSZXN1bHRzLCB1bnByb2Nlc3NlZFJlY29yZHMgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZSBvcGVuZWQgam9iXG4gICAqL1xuICBhc3luYyBjbG9zZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc3RhdGU6IEpvYlN0YXRlVjIgPSAnVXBsb2FkQ29tcGxldGUnO1xuICAgICAgdGhpcy5qb2JJbmZvID0gYXdhaXQgdGhpcy5jcmVhdGVJbmdlc3RSZXF1ZXN0PEpvYkluZm9WMj4oe1xuICAgICAgICBtZXRob2Q6ICdQQVRDSCcsXG4gICAgICAgIHBhdGg6IGAvJHt0aGlzLmpvYkluZm8uaWR9YCxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBzdGF0ZSB9KSxcbiAgICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLTgnIH0sXG4gICAgICAgIHJlc3BvbnNlVHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgfSk7XG4gICAgICB0aGlzLmVtaXQoJ3VwbG9hZGNvbXBsZXRlJyk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2V0IHRoZSBzdGF0dXMgdG8gYWJvcnRcbiAgICovXG4gIGFzeW5jIGFib3J0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdGF0ZTogSm9iU3RhdGVWMiA9ICdBYm9ydGVkJztcbiAgICAgIHRoaXMuam9iSW5mbyA9IGF3YWl0IHRoaXMuY3JlYXRlSW5nZXN0UmVxdWVzdDxKb2JJbmZvVjI+KHtcbiAgICAgICAgbWV0aG9kOiAnUEFUQ0gnLFxuICAgICAgICBwYXRoOiBgLyR7dGhpcy5qb2JJbmZvLmlkfWAsXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgc3RhdGUgfSksXG4gICAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PXV0Zi04JyB9LFxuICAgICAgICByZXNwb25zZVR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgIH0pO1xuICAgICAgdGhpcy5lbWl0KCdhYm9ydGVkJyk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUG9sbCBmb3IgdGhlIHN0YXRlIG9mIHRoZSBwcm9jZXNzaW5nIGZvciB0aGUgam9iLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCB3aWxsIG9ubHkgdGhyb3cgYWZ0ZXIgYSB0aW1lb3V0LiBUbyBjYXB0dXJlIGFcbiAgICogam9iIGZhaWx1cmUgd2hpbGUgcG9sbGluZyB5b3UgbXVzdCBzZXQgYSBsaXN0ZW5lciBmb3IgdGhlXG4gICAqIGBmYWlsZWRgIGV2ZW50IGJlZm9yZSBjYWxsaW5nIGl0OlxuICAgKlxuICAgKiBqb2Iub24oJ2ZhaWxlZCcsIChlcnIpID0+IGNvbnNvbGUuZXJyb3IoZXJyKSlcbiAgICogYXdhaXQgam9iLnBvbGwoKVxuICAgKlxuICAgKiBAcGFyYW0gaW50ZXJ2YWwgUG9sbGluZyBpbnRlcnZhbCBpbiBtaWxsaXNlY29uZHNcbiAgICogQHBhcmFtIHRpbWVvdXQgUG9sbGluZyB0aW1lb3V0IGluIG1pbGxpc2Vjb25kc1xuICAgKiBAcmV0dXJucyB7UHJvbWlzZTx2b2lkPn0gQSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2hlbiB0aGUgam9iIGZpbmlzaGVzIHN1Y2Nlc3NmdWxseVxuICAgKi9cbiAgYXN5bmMgcG9sbChcbiAgICBpbnRlcnZhbDogbnVtYmVyID0gdGhpcy4jcG9sbGluZ09wdGlvbnMucG9sbEludGVydmFsLFxuICAgIHRpbWVvdXQ6IG51bWJlciA9IHRoaXMuI3BvbGxpbmdPcHRpb25zLnBvbGxUaW1lb3V0LFxuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBqb2JJZCA9IGdldEpvYklkT3JFcnJvcih0aGlzLmpvYkluZm8pO1xuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG5cbiAgICB3aGlsZSAoc3RhcnRUaW1lICsgdGltZW91dCA+IERhdGUubm93KCkpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IHRoaXMuY2hlY2soKTtcbiAgICAgICAgc3dpdGNoIChyZXMuc3RhdGUpIHtcbiAgICAgICAgICBjYXNlICdPcGVuJzpcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSm9iIGhhcyBub3QgYmVlbiBzdGFydGVkJyk7XG4gICAgICAgICAgY2FzZSAnQWJvcnRlZCc6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0pvYiBoYXMgYmVlbiBhYm9ydGVkJyk7XG4gICAgICAgICAgY2FzZSAnVXBsb2FkQ29tcGxldGUnOlxuICAgICAgICAgIGNhc2UgJ0luUHJvZ3Jlc3MnOlxuICAgICAgICAgICAgYXdhaXQgZGVsYXkoaW50ZXJ2YWwpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnRmFpbGVkJzpcbiAgICAgICAgICAgIHRoaXMuZW1pdCgnZmFpbGVkJywgbmV3IEVycm9yKCdJbmdlc3Qgam9iIGZhaWxlZCB0byBjb21wbGV0ZS4nKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgY2FzZSAnSm9iQ29tcGxldGUnOlxuICAgICAgICAgICAgdGhpcy5lbWl0KCdqb2Jjb21wbGV0ZScpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgdGhpcy5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB0aW1lb3V0RXJyb3IgPSBuZXcgSm9iUG9sbGluZ1RpbWVvdXRFcnJvcihcbiAgICAgIGBQb2xsaW5nIHRpbWVkIG91dCBhZnRlciAke3RpbWVvdXR9bXMuIEpvYiBJZCA9ICR7am9iSWR9YCxcbiAgICAgIGpvYklkLFxuICAgICk7XG4gICAgdGhpcy5lbWl0KCdlcnJvcicsIHRpbWVvdXRFcnJvcik7XG4gICAgdGhyb3cgdGltZW91dEVycm9yO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIHRoZSBsYXRlc3QgYmF0Y2ggc3RhdHVzIGluIHNlcnZlclxuICAgKi9cbiAgYXN5bmMgY2hlY2soKTogUHJvbWlzZTxKb2JJbmZvVjI+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgam9iSW5mbyA9IGF3YWl0IHRoaXMuY3JlYXRlSW5nZXN0UmVxdWVzdDxKb2JJbmZvVjI+KHtcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgcGF0aDogYC8ke2dldEpvYklkT3JFcnJvcih0aGlzLmpvYkluZm8pfWAsXG4gICAgICAgIHJlc3BvbnNlVHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgfSk7XG4gICAgICB0aGlzLmpvYkluZm8gPSBqb2JJbmZvO1xuICAgICAgcmV0dXJuIGpvYkluZm87XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG4gIH1cblxuICBhc3luYyBnZXRTdWNjZXNzZnVsUmVzdWx0cygpOiBQcm9taXNlPEluZ2VzdEpvYlYyU3VjY2Vzc2Z1bFJlc3VsdHM8Uz4+IHtcbiAgICBpZiAodGhpcy4jYnVsa0pvYlN1Y2Nlc3NmdWxSZXN1bHRzKSB7XG4gICAgICByZXR1cm4gdGhpcy4jYnVsa0pvYlN1Y2Nlc3NmdWxSZXN1bHRzO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCB0aGlzLmNyZWF0ZUluZ2VzdFJlcXVlc3Q8XG4gICAgICBJbmdlc3RKb2JWMlN1Y2Nlc3NmdWxSZXN1bHRzPFM+IHwgdW5kZWZpbmVkXG4gICAgPih7XG4gICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgcGF0aDogYC8ke2dldEpvYklkT3JFcnJvcih0aGlzLmpvYkluZm8pfS9zdWNjZXNzZnVsUmVzdWx0c2AsXG4gICAgICByZXNwb25zZVR5cGU6ICd0ZXh0L2NzdicsXG4gICAgfSk7XG5cbiAgICB0aGlzLiNidWxrSm9iU3VjY2Vzc2Z1bFJlc3VsdHMgPSByZXN1bHRzID8/IFtdO1xuXG4gICAgcmV0dXJuIHRoaXMuI2J1bGtKb2JTdWNjZXNzZnVsUmVzdWx0cztcbiAgfVxuXG4gIGFzeW5jIGdldEZhaWxlZFJlc3VsdHMoKTogUHJvbWlzZTxJbmdlc3RKb2JWMkZhaWxlZFJlc3VsdHM8Uz4+IHtcbiAgICBpZiAodGhpcy4jYnVsa0pvYkZhaWxlZFJlc3VsdHMpIHtcbiAgICAgIHJldHVybiB0aGlzLiNidWxrSm9iRmFpbGVkUmVzdWx0cztcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgdGhpcy5jcmVhdGVJbmdlc3RSZXF1ZXN0PFxuICAgICAgSW5nZXN0Sm9iVjJGYWlsZWRSZXN1bHRzPFM+IHwgdW5kZWZpbmVkXG4gICAgPih7XG4gICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgcGF0aDogYC8ke2dldEpvYklkT3JFcnJvcih0aGlzLmpvYkluZm8pfS9mYWlsZWRSZXN1bHRzYCxcbiAgICAgIHJlc3BvbnNlVHlwZTogJ3RleHQvY3N2JyxcbiAgICB9KTtcblxuICAgIHRoaXMuI2J1bGtKb2JGYWlsZWRSZXN1bHRzID0gcmVzdWx0cyA/PyBbXTtcblxuICAgIHJldHVybiB0aGlzLiNidWxrSm9iRmFpbGVkUmVzdWx0cztcbiAgfVxuXG4gIGFzeW5jIGdldFVucHJvY2Vzc2VkUmVjb3JkcygpOiBQcm9taXNlPEluZ2VzdEpvYlYyVW5wcm9jZXNzZWRSZWNvcmRzPFM+PiB7XG4gICAgaWYgKHRoaXMuI2J1bGtKb2JVbnByb2Nlc3NlZFJlY29yZHMpIHtcbiAgICAgIHJldHVybiB0aGlzLiNidWxrSm9iVW5wcm9jZXNzZWRSZWNvcmRzO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCB0aGlzLmNyZWF0ZUluZ2VzdFJlcXVlc3Q8XG4gICAgICBJbmdlc3RKb2JWMlVucHJvY2Vzc2VkUmVjb3JkczxTPiB8IHVuZGVmaW5lZFxuICAgID4oe1xuICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgIHBhdGg6IGAvJHtnZXRKb2JJZE9yRXJyb3IodGhpcy5qb2JJbmZvKX0vdW5wcm9jZXNzZWRyZWNvcmRzYCxcbiAgICAgIHJlc3BvbnNlVHlwZTogJ3RleHQvY3N2JyxcbiAgICB9KTtcblxuICAgIHRoaXMuI2J1bGtKb2JVbnByb2Nlc3NlZFJlY29yZHMgPSByZXN1bHRzID8/IFtdO1xuXG4gICAgcmV0dXJuIHRoaXMuI2J1bGtKb2JVbnByb2Nlc3NlZFJlY29yZHM7XG4gIH1cblxuICAvKipcbiAgICogRGVsZXRlcyBhbiBpbmdlc3Qgam9iLlxuICAgKi9cbiAgYXN5bmMgZGVsZXRlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiB0aGlzLmNyZWF0ZUluZ2VzdFJlcXVlc3Q8dm9pZD4oe1xuICAgICAgbWV0aG9kOiAnREVMRVRFJyxcbiAgICAgIHBhdGg6IGAvJHtnZXRKb2JJZE9yRXJyb3IodGhpcy5qb2JJbmZvKX1gLFxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVJbmdlc3RSZXF1ZXN0PFQ+KHJlcXVlc3Q6IEJ1bGtSZXF1ZXN0KSB7XG4gICAgY29uc3QgeyBwYXRoLCByZXNwb25zZVR5cGUgfSA9IHJlcXVlc3Q7XG4gICAgY29uc3QgYmFzZVVybCA9IFtcbiAgICAgIHRoaXMuI2Nvbm5lY3Rpb24uaW5zdGFuY2VVcmwsXG4gICAgICAnc2VydmljZXMvZGF0YScsXG4gICAgICBgdiR7dGhpcy4jY29ubmVjdGlvbi52ZXJzaW9ufWAsXG4gICAgICAnam9icy9pbmdlc3QnLFxuICAgIF0uam9pbignLycpO1xuXG4gICAgcmV0dXJuIG5ldyBCdWxrQXBpVjIodGhpcy4jY29ubmVjdGlvbiwgeyByZXNwb25zZVR5cGUgfSkucmVxdWVzdDxUPih7XG4gICAgICAuLi5yZXF1ZXN0LFxuICAgICAgdXJsOiBiYXNlVXJsICsgcGF0aCxcbiAgICB9KTtcbiAgfVxufVxuXG5jbGFzcyBKb2JEYXRhVjI8XG4gIFMgZXh0ZW5kcyBTY2hlbWEsXG4gIE9wciBleHRlbmRzIEluZ2VzdE9wZXJhdGlvblxuPiBleHRlbmRzIFdyaXRhYmxlIHtcbiAgcmVhZG9ubHkgI2pvYjogSW5nZXN0Sm9iVjI8UywgT3ByPjtcbiAgcmVhZG9ubHkgI3VwbG9hZFN0cmVhbTogU2VyaWFsaXphYmxlO1xuICByZWFkb25seSAjZG93bmxvYWRTdHJlYW06IFBhcnNhYmxlO1xuICByZWFkb25seSAjZGF0YVN0cmVhbTogRHVwbGV4O1xuICAjcmVzdWx0OiBhbnk7XG5cbiAgLyoqXG4gICAqXG4gICAqL1xuICBjb25zdHJ1Y3RvcihvcHRpb25zOiBDcmVhdGVKb2JEYXRhVjJPcHRpb25zPFMsIE9wcj4pIHtcbiAgICBzdXBlcih7IG9iamVjdE1vZGU6IHRydWUgfSk7XG5cbiAgICBjb25zdCBjcmVhdGVSZXF1ZXN0ID0gb3B0aW9ucy5jcmVhdGVSZXF1ZXN0O1xuXG4gICAgdGhpcy4jam9iID0gb3B0aW9ucy5qb2I7XG4gICAgdGhpcy4jdXBsb2FkU3RyZWFtID0gbmV3IFNlcmlhbGl6YWJsZSgpO1xuICAgIHRoaXMuI2Rvd25sb2FkU3RyZWFtID0gbmV3IFBhcnNhYmxlKCk7XG5cbiAgICBjb25zdCBjb252ZXJ0ZXJPcHRpb25zID0geyBudWxsVmFsdWU6ICcjTi9BJyB9O1xuICAgIGNvbnN0IHVwbG9hZERhdGFTdHJlYW0gPSB0aGlzLiN1cGxvYWRTdHJlYW0uc3RyZWFtKCdjc3YnLCBjb252ZXJ0ZXJPcHRpb25zKTtcbiAgICBjb25zdCBkb3dubG9hZERhdGFTdHJlYW0gPSB0aGlzLiNkb3dubG9hZFN0cmVhbS5zdHJlYW0oXG4gICAgICAnY3N2JyxcbiAgICAgIGNvbnZlcnRlck9wdGlvbnMsXG4gICAgKTtcblxuICAgIHRoaXMuI2RhdGFTdHJlYW0gPSBjb25jYXRTdHJlYW1zQXNEdXBsZXgoXG4gICAgICB1cGxvYWREYXRhU3RyZWFtLFxuICAgICAgZG93bmxvYWREYXRhU3RyZWFtLFxuICAgICk7XG5cbiAgICB0aGlzLm9uKCdmaW5pc2gnLCAoKSA9PiB0aGlzLiN1cGxvYWRTdHJlYW0uZW5kKCkpO1xuXG4gICAgdXBsb2FkRGF0YVN0cmVhbS5vbmNlKCdyZWFkYWJsZScsICgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIHBpcGUgdXBsb2FkIGRhdGEgdG8gYmF0Y2ggQVBJIHJlcXVlc3Qgc3RyZWFtXG4gICAgICAgIGNvbnN0IHJlcSA9IGNyZWF0ZVJlcXVlc3Qoe1xuICAgICAgICAgIG1ldGhvZDogJ1BVVCcsXG4gICAgICAgICAgcGF0aDogYC8ke3RoaXMuI2pvYi5qb2JJbmZvPy5pZH0vYmF0Y2hlc2AsXG4gICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICd0ZXh0L2NzdicsXG4gICAgICAgICAgfSxcbiAgICAgICAgICByZXNwb25zZVR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgKGFzeW5jICgpID0+IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzID0gYXdhaXQgcmVxO1xuICAgICAgICAgICAgdGhpcy5lbWl0KCdyZXNwb25zZScsIHJlcyk7XG4gICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICB0aGlzLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgdXBsb2FkRGF0YVN0cmVhbS5waXBlKHJlcS5zdHJlYW0oKSk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgdGhpcy5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBfd3JpdGUocmVjb3JkXzogUmVjb3JkLCBlbmM6IHN0cmluZywgY2I6ICgpID0+IHZvaWQpIHtcbiAgICBjb25zdCB7IElkLCB0eXBlLCBhdHRyaWJ1dGVzLCAuLi5ycmVjIH0gPSByZWNvcmRfO1xuICAgIGxldCByZWNvcmQ7XG4gICAgc3dpdGNoICh0aGlzLiNqb2Iuam9iSW5mby5vcGVyYXRpb24pIHtcbiAgICAgIGNhc2UgJ2luc2VydCc6XG4gICAgICAgIHJlY29yZCA9IHJyZWM7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnZGVsZXRlJzpcbiAgICAgIGNhc2UgJ2hhcmREZWxldGUnOlxuICAgICAgICByZWNvcmQgPSB7IElkIH07XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmVjb3JkID0geyBJZCwgLi4ucnJlYyB9O1xuICAgIH1cbiAgICB0aGlzLiN1cGxvYWRTdHJlYW0ud3JpdGUocmVjb3JkLCBlbmMsIGNiKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGR1cGxleCBzdHJlYW0gd2hpY2ggYWNjZXB0cyBDU1YgZGF0YSBpbnB1dCBhbmQgYmF0Y2ggcmVzdWx0IG91dHB1dFxuICAgKi9cbiAgc3RyZWFtKCkge1xuICAgIHJldHVybiB0aGlzLiNkYXRhU3RyZWFtO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4ZWN1dGUgYmF0Y2ggb3BlcmF0aW9uXG4gICAqL1xuICBleGVjdXRlKGlucHV0Pzogc3RyaW5nIHwgUmVjb3JkW10gfCBSZWFkYWJsZSkge1xuICAgIGlmICh0aGlzLiNyZXN1bHQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRGF0YSBjYW4gb25seSBiZSB1cGxvYWRlZCB0byBhIGpvYiBvbmNlLicpO1xuICAgIH1cblxuICAgIHRoaXMuI3Jlc3VsdCA9IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHRoaXMub25jZSgncmVzcG9uc2UnLCAoKSA9PiByZXNvbHZlKCkpO1xuICAgICAgdGhpcy5vbmNlKCdlcnJvcicsIHJlamVjdCk7XG4gICAgfSk7XG5cbiAgICBpZiAoaXNPYmplY3QoaW5wdXQpICYmICdwaXBlJyBpbiBpbnB1dCAmJiBpc0Z1bmN0aW9uKGlucHV0LnBpcGUpKSB7XG4gICAgICAvLyBpZiBpbnB1dCBoYXMgc3RyZWFtLlJlYWRhYmxlIGludGVyZmFjZVxuICAgICAgaW5wdXQucGlwZSh0aGlzLiNkYXRhU3RyZWFtKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoaW5wdXQpKSB7XG4gICAgICAgIGZvciAoY29uc3QgcmVjb3JkIG9mIGlucHV0KSB7XG4gICAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMocmVjb3JkKSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiByZWNvcmRba2V5XSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgIHJlY29yZFtrZXldID0gU3RyaW5nKHJlY29yZFtrZXldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy53cml0ZShyZWNvcmQpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZW5kKCk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhpcy4jZGF0YVN0cmVhbS53cml0ZShpbnB1dCwgJ3V0ZjgnKTtcbiAgICAgICAgdGhpcy4jZGF0YVN0cmVhbS5lbmQoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9taXNlL0ErIGludGVyZmFjZVxuICAgKiBEZWxlZ2F0ZSB0byBwcm9taXNlLCByZXR1cm4gcHJvbWlzZSBpbnN0YW5jZSBmb3IgYmF0Y2ggcmVzdWx0XG4gICAqL1xuICB0aGVuKG9uUmVzb2x2ZWQ6ICgpID0+IHZvaWQsIG9uUmVqZWN0OiAoZXJyOiBhbnkpID0+IHZvaWQpIHtcbiAgICBpZiAodGhpcy4jcmVzdWx0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuZXhlY3V0ZSgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy4jcmVzdWx0IS50aGVuKG9uUmVzb2x2ZWQsIG9uUmVqZWN0KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRKb2JJZE9yRXJyb3Ioam9iSW5mbzogUGFydGlhbDxKb2JJbmZvVjI+IHwgdW5kZWZpbmVkKTogc3RyaW5nIHtcbiAgY29uc3Qgam9iSWQgPSBqb2JJbmZvPy5pZDtcbiAgaWYgKGpvYklkID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGpvYiBpZCwgbWF5YmUgeW91IG5lZWQgdG8gY2FsbCBgam9iLm9wZW4oKWAgZmlyc3QuJyk7XG4gIH1cbiAgcmV0dXJuIGpvYklkO1xufVxuXG5mdW5jdGlvbiBkZWxheShtczogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gc2V0VGltZW91dChyZXNvbHZlLCBtcykpO1xufVxuXG4vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cbi8qXG4gKiBSZWdpc3RlciBob29rIGluIGNvbm5lY3Rpb24gaW5zdGFudGlhdGlvbiBmb3IgZHluYW1pY2FsbHkgYWRkaW5nIHRoaXMgQVBJIG1vZHVsZSBmZWF0dXJlc1xuICovXG5yZWdpc3Rlck1vZHVsZSgnYnVsaycsIChjb25uKSA9PiBuZXcgQnVsayhjb25uKSk7XG5yZWdpc3Rlck1vZHVsZSgnYnVsazInLCAoY29ubikgPT4gbmV3IEJ1bGtWMihjb25uKSk7XG5cbmV4cG9ydCBkZWZhdWx0IEJ1bGs7XG4iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUlBLElBQUFBLE9BQUEsR0FBQUMsT0FBQTtBQUNBLElBQUFDLE9BQUEsR0FBQUQsT0FBQTtBQUNBLElBQUFFLFlBQUEsR0FBQUMsc0JBQUEsQ0FBQUgsT0FBQTtBQUVBLElBQUFJLGFBQUEsR0FBQUosT0FBQTtBQUNBLElBQUFLLFFBQUEsR0FBQUYsc0JBQUEsQ0FBQUgsT0FBQTtBQUVBLElBQUFNLFFBQUEsR0FBQU4sT0FBQTtBQUVBLElBQUFPLFFBQUEsR0FBQVAsT0FBQTtBQVNBLElBQUFRLFNBQUEsR0FBQVIsT0FBQTtBQUF3RCxTQUFBUyxRQUFBQyxNQUFBLEVBQUFDLGNBQUEsUUFBQUMsSUFBQSxHQUFBQyxhQUFBLENBQUFILE1BQUEsT0FBQUksNkJBQUEsUUFBQUMsT0FBQSxHQUFBRCw2QkFBQSxDQUFBSixNQUFBLE9BQUFDLGNBQUEsRUFBQUksT0FBQSxHQUFBQyx1QkFBQSxDQUFBRCxPQUFBLEVBQUFFLElBQUEsQ0FBQUYsT0FBQSxZQUFBRyxHQUFBLFdBQUFDLGdDQUFBLENBQUFULE1BQUEsRUFBQVEsR0FBQSxFQUFBRSxVQUFBLE1BQUFSLElBQUEsQ0FBQVMsSUFBQSxDQUFBQyxLQUFBLENBQUFWLElBQUEsRUFBQUcsT0FBQSxZQUFBSCxJQUFBO0FBQUEsU0FBQVcsY0FBQUMsTUFBQSxhQUFBQyxDQUFBLE1BQUFBLENBQUEsR0FBQUMsU0FBQSxDQUFBQyxNQUFBLEVBQUFGLENBQUEsVUFBQUcsTUFBQSxHQUFBRixTQUFBLENBQUFELENBQUEsWUFBQUMsU0FBQSxDQUFBRCxDQUFBLFlBQUFBLENBQUEsWUFBQUksU0FBQSxFQUFBQyx3QkFBQSxDQUFBRCxTQUFBLEdBQUFwQixPQUFBLENBQUFzQixNQUFBLENBQUFILE1BQUEsVUFBQVgsSUFBQSxDQUFBWSxTQUFBLFlBQUFHLEdBQUEsUUFBQUMsZ0JBQUEsQ0FBQUMsT0FBQSxFQUFBVixNQUFBLEVBQUFRLEdBQUEsRUFBQUosTUFBQSxDQUFBSSxHQUFBLG1CQUFBRyxpQ0FBQSxJQUFBQyx3QkFBQSxDQUFBWixNQUFBLEVBQUFXLGlDQUFBLENBQUFQLE1BQUEsaUJBQUFTLFNBQUEsRUFBQVAsd0JBQUEsQ0FBQU8sU0FBQSxHQUFBNUIsT0FBQSxDQUFBc0IsTUFBQSxDQUFBSCxNQUFBLElBQUFYLElBQUEsQ0FBQW9CLFNBQUEsWUFBQUwsR0FBQSxJQUFBTSxzQkFBQSxDQUFBZCxNQUFBLEVBQUFRLEdBQUEsRUFBQWIsZ0NBQUEsQ0FBQVMsTUFBQSxFQUFBSSxHQUFBLG1CQUFBUixNQUFBLElBdEJ4RDtBQUNBO0FBQ0E7QUFDQTtBQXFCQTs7QUEyTEE7QUFDQTtBQUNBO0FBQ08sTUFBTWUsR0FBRyxTQUdOQyxvQkFBWSxDQUFDO0VBV3JCO0FBQ0Y7QUFDQTtFQUNFQyxXQUFXQSxDQUNUQyxJQUFhLEVBQ2JDLElBQW1CLEVBQ25CQyxTQUFxQixFQUNyQkMsT0FBMkIsRUFDM0JDLEtBQWMsRUFDZDtJQUNBLEtBQUssQ0FBQyxDQUFDO0lBQUMsSUFBQWIsZ0JBQUEsQ0FBQUMsT0FBQTtJQUFBLElBQUFELGdCQUFBLENBQUFDLE9BQUE7SUFBQSxJQUFBRCxnQkFBQSxDQUFBQyxPQUFBO0lBQUEsSUFBQUQsZ0JBQUEsQ0FBQUMsT0FBQTtJQUFBLElBQUFELGdCQUFBLENBQUFDLE9BQUE7SUFBQSxJQUFBRCxnQkFBQSxDQUFBQyxPQUFBO0lBQUEsSUFBQUQsZ0JBQUEsQ0FBQUMsT0FBQTtJQUFBLElBQUFELGdCQUFBLENBQUFDLE9BQUE7SUFBQSxJQUFBRCxnQkFBQSxDQUFBQyxPQUFBO0lBQ1IsSUFBSSxDQUFDYSxLQUFLLEdBQUdMLElBQUk7SUFDakIsSUFBSSxDQUFDQyxJQUFJLEdBQUdBLElBQUk7SUFDaEIsSUFBSSxDQUFDQyxTQUFTLEdBQUdBLFNBQVM7SUFDMUIsSUFBSSxDQUFDQyxPQUFPLEdBQUdBLE9BQU8sSUFBSSxDQUFDLENBQUM7SUFDNUIsSUFBSSxDQUFDRyxFQUFFLEdBQUdGLEtBQUssYUFBTEEsS0FBSyxjQUFMQSxLQUFLLEdBQUksSUFBSTtJQUN2QixJQUFJLENBQUNHLEtBQUssR0FBRyxJQUFJLENBQUNELEVBQUUsR0FBRyxNQUFNLEdBQUcsU0FBUztJQUN6QyxJQUFJLENBQUNFLFFBQVEsR0FBRyxDQUFDLENBQUM7SUFDbEI7SUFDQSxJQUFJLENBQUNDLEVBQUUsQ0FBQyxPQUFPLEVBQUdDLEtBQUssSUFBTSxJQUFJLENBQUNDLE1BQU0sR0FBR0QsS0FBTSxDQUFDO0VBQ3BEOztFQUVBO0FBQ0Y7QUFDQTtFQUNFRSxJQUFJQSxDQUFBLEVBQUc7SUFDTDtJQUNBLElBQUksQ0FBQyxJQUFJLENBQUNDLFFBQVEsRUFBRTtNQUNsQixJQUFJLENBQUNBLFFBQVEsR0FBRyxJQUFJLENBQUNDLEtBQUssQ0FBQyxDQUFDO0lBQzlCO0lBQ0EsT0FBTyxJQUFJLENBQUNELFFBQVE7RUFDdEI7O0VBRUE7QUFDRjtBQUNBO0VBQ0VFLElBQUlBLENBQUEsRUFBcUI7SUFDdkIsTUFBTWYsSUFBSSxHQUFHLElBQUksQ0FBQ0ssS0FBSztJQUN2QixNQUFNRixPQUFPLEdBQUcsSUFBSSxDQUFDQSxPQUFPOztJQUU1QjtJQUNBLElBQUksQ0FBQyxJQUFJLENBQUNGLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQ0MsU0FBUyxFQUFFO01BQ2pDLE1BQU0sSUFBSWMsS0FBSyxDQUFDLGdEQUFnRCxDQUFDO0lBQ25FOztJQUVBO0lBQ0EsSUFBSSxDQUFDLElBQUksQ0FBQ0gsUUFBUSxFQUFFO01BQUEsSUFBQUksUUFBQTtNQUNsQixJQUFJZixTQUFTLEdBQUcsSUFBSSxDQUFDQSxTQUFTLENBQUNnQixXQUFXLENBQUMsQ0FBQztNQUM1QyxJQUFJaEIsU0FBUyxLQUFLLFlBQVksRUFBRTtRQUM5QkEsU0FBUyxHQUFHLFlBQVk7TUFDMUI7TUFDQSxJQUFJQSxTQUFTLEtBQUssVUFBVSxFQUFFO1FBQzVCQSxTQUFTLEdBQUcsVUFBVTtNQUN4QjtNQUNBLE1BQU1pQixJQUFJLEdBQUcsSUFBQUMsS0FBQSxDQUFBNUIsT0FBQSxFQUFBeUIsUUFBQSxHQUFDO0FBQ3BCO0FBQ0E7QUFDQSxlQUFlZixTQUFVO0FBQ3pCLFlBQVksSUFBSSxDQUFDRCxJQUFLO0FBQ3RCLElBQ0lFLE9BQU8sQ0FBQ2tCLFVBQVUsR0FDYix3QkFBdUJsQixPQUFPLENBQUNrQixVQUFXLHdCQUF1QixHQUNsRSxFQUNMO0FBQ0gsSUFDSWxCLE9BQU8sQ0FBQ21CLGVBQWUsR0FDbEIsb0JBQW1CbkIsT0FBTyxDQUFDbUIsZUFBZ0Isb0JBQW1CLEdBQy9ELEVBQ0w7QUFDSCxJQUNJbkIsT0FBTyxDQUFDb0IsZ0JBQWdCLEdBQ25CLHFCQUFvQnBCLE9BQU8sQ0FBQ29CLGdCQUFpQixxQkFBb0IsR0FDbEUsRUFDTDtBQUNIO0FBQ0E7QUFDQSxPQUFPLEVBQUFoRCxJQUFBLENBQUEwQyxRQUFNLENBQUM7TUFFUixJQUFJLENBQUNKLFFBQVEsR0FBRyxDQUFDLFlBQVk7UUFDM0IsSUFBSTtVQUNGLE1BQU1XLEdBQUcsR0FBRyxNQUFNeEIsSUFBSSxDQUFDeUIsUUFBUSxDQUFrQjtZQUMvQ0MsTUFBTSxFQUFFLE1BQU07WUFDZEMsSUFBSSxFQUFFLE1BQU07WUFDWlIsSUFBSTtZQUNKUyxPQUFPLEVBQUU7Y0FDUCxjQUFjLEVBQUU7WUFDbEIsQ0FBQztZQUNEQyxZQUFZLEVBQUU7VUFDaEIsQ0FBQyxDQUFDO1VBQ0YsSUFBSSxDQUFDQyxJQUFJLENBQUMsTUFBTSxFQUFFTixHQUFHLENBQUNPLE9BQU8sQ0FBQztVQUM5QixJQUFJLENBQUN6QixFQUFFLEdBQUdrQixHQUFHLENBQUNPLE9BQU8sQ0FBQ3pCLEVBQUU7VUFDeEIsSUFBSSxDQUFDQyxLQUFLLEdBQUdpQixHQUFHLENBQUNPLE9BQU8sQ0FBQ3hCLEtBQUs7VUFDOUIsT0FBT2lCLEdBQUcsQ0FBQ08sT0FBTztRQUNwQixDQUFDLENBQUMsT0FBT0MsR0FBRyxFQUFFO1VBQ1osSUFBSSxDQUFDRixJQUFJLENBQUMsT0FBTyxFQUFFRSxHQUFHLENBQUM7VUFDdkIsTUFBTUEsR0FBRztRQUNYO01BQ0YsQ0FBQyxFQUFFLENBQUM7SUFDTjtJQUNBLE9BQU8sSUFBSSxDQUFDbkIsUUFBUTtFQUN0Qjs7RUFFQTtBQUNGO0FBQ0E7RUFDRW9CLFdBQVdBLENBQUEsRUFBa0I7SUFDM0IsTUFBTUMsS0FBSyxHQUFHLElBQUlDLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFDN0JELEtBQUssQ0FBQ3pCLEVBQUUsQ0FBQyxPQUFPLEVBQUUsTUFBTTtNQUN0QixJQUFJLENBQUNELFFBQVEsQ0FBQzBCLEtBQUssQ0FBQzVCLEVBQUUsQ0FBRSxHQUFHNEIsS0FBSztJQUNsQyxDQUFDLENBQUM7SUFDRixPQUFPQSxLQUFLO0VBQ2Q7O0VBRUE7QUFDRjtBQUNBO0VBQ0VBLEtBQUtBLENBQUNFLE9BQWUsRUFBaUI7SUFDcEMsSUFBSUYsS0FBSyxHQUFHLElBQUksQ0FBQzFCLFFBQVEsQ0FBQzRCLE9BQU8sQ0FBQztJQUNsQyxJQUFJLENBQUNGLEtBQUssRUFBRTtNQUNWQSxLQUFLLEdBQUcsSUFBSUMsS0FBSyxDQUFDLElBQUksRUFBRUMsT0FBTyxDQUFDO01BQ2hDLElBQUksQ0FBQzVCLFFBQVEsQ0FBQzRCLE9BQU8sQ0FBQyxHQUFHRixLQUFLO0lBQ2hDO0lBQ0EsT0FBT0EsS0FBSztFQUNkOztFQUVBO0FBQ0Y7QUFDQTtFQUNFcEIsS0FBS0EsQ0FBQSxFQUFHO0lBQ04sTUFBTWQsSUFBSSxHQUFHLElBQUksQ0FBQ0ssS0FBSztJQUN2QixNQUFNZ0MsTUFBTSxHQUFHckMsSUFBSSxDQUFDc0MsT0FBTztJQUUzQixJQUFJLENBQUN6QixRQUFRLEdBQUcsQ0FBQyxZQUFZO01BQzNCLE1BQU1ULEtBQUssR0FBRyxNQUFNLElBQUksQ0FBQ21DLEtBQUssQ0FBQyxDQUFDO01BQ2hDLE1BQU1mLEdBQUcsR0FBRyxNQUFNeEIsSUFBSSxDQUFDeUIsUUFBUSxDQUFrQjtRQUMvQ0MsTUFBTSxFQUFFLEtBQUs7UUFDYkMsSUFBSSxFQUFFLE9BQU8sR0FBR3ZCLEtBQUs7UUFDckJ5QixZQUFZLEVBQUU7TUFDaEIsQ0FBQyxDQUFDO01BQ0ZRLE1BQU0sQ0FBQ0csS0FBSyxDQUFDaEIsR0FBRyxDQUFDTyxPQUFPLENBQUM7TUFDekIsSUFBSSxDQUFDekIsRUFBRSxHQUFHa0IsR0FBRyxDQUFDTyxPQUFPLENBQUN6QixFQUFFO01BQ3hCLElBQUksQ0FBQ0wsSUFBSSxHQUFHdUIsR0FBRyxDQUFDTyxPQUFPLENBQUMvRCxNQUFNO01BQzlCLElBQUksQ0FBQ2tDLFNBQVMsR0FBR3NCLEdBQUcsQ0FBQ08sT0FBTyxDQUFDN0IsU0FBZ0I7TUFDN0MsSUFBSSxDQUFDSyxLQUFLLEdBQUdpQixHQUFHLENBQUNPLE9BQU8sQ0FBQ3hCLEtBQUs7TUFDOUIsT0FBT2lCLEdBQUcsQ0FBQ08sT0FBTztJQUNwQixDQUFDLEVBQUUsQ0FBQztJQUVKLE9BQU8sSUFBSSxDQUFDbEIsUUFBUTtFQUN0Qjs7RUFFQTtBQUNGO0FBQ0E7RUFDRTBCLEtBQUtBLENBQUEsRUFBb0I7SUFDdkIsT0FBTyxJQUFJLENBQUNqQyxFQUFFLEdBQ1ZtQyxRQUFBLENBQUFqRCxPQUFBLENBQVFrRCxPQUFPLENBQUMsSUFBSSxDQUFDcEMsRUFBRSxDQUFDLEdBQ3hCLElBQUksQ0FBQ1MsSUFBSSxDQUFDLENBQUMsQ0FBQzRCLElBQUksQ0FBQyxDQUFDO01BQUVyQztJQUFHLENBQUMsS0FBS0EsRUFBRSxDQUFDO0VBQ3RDOztFQUVBO0FBQ0Y7QUFDQTtFQUNFLE1BQU1zQyxJQUFJQSxDQUFBLEVBQUc7SUFDWCxNQUFNNUMsSUFBSSxHQUFHLElBQUksQ0FBQ0ssS0FBSztJQUN2QixNQUFNZ0MsTUFBTSxHQUFHckMsSUFBSSxDQUFDc0MsT0FBTztJQUMzQixNQUFNbEMsS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDbUMsS0FBSyxDQUFDLENBQUM7SUFDaEMsTUFBTWYsR0FBRyxHQUFHLE1BQU14QixJQUFJLENBQUN5QixRQUFRLENBQXdCO01BQ3JEQyxNQUFNLEVBQUUsS0FBSztNQUNiQyxJQUFJLEVBQUUsT0FBTyxHQUFHdkIsS0FBSyxHQUFHLFFBQVE7TUFDaEN5QixZQUFZLEVBQUU7SUFDaEIsQ0FBQyxDQUFDO0lBQ0ZRLE1BQU0sQ0FBQ0csS0FBSyxDQUFDaEIsR0FBRyxDQUFDcUIsYUFBYSxDQUFDQyxTQUFTLENBQUM7SUFDekMsTUFBTUQsYUFBYSxHQUFHLElBQUFFLFFBQUEsQ0FBQXZELE9BQUEsRUFBY2dDLEdBQUcsQ0FBQ3FCLGFBQWEsQ0FBQ0MsU0FBUyxDQUFDLEdBQzVEdEIsR0FBRyxDQUFDcUIsYUFBYSxDQUFDQyxTQUFTLEdBQzNCLENBQUN0QixHQUFHLENBQUNxQixhQUFhLENBQUNDLFNBQVMsQ0FBQztJQUNqQyxPQUFPRCxhQUFhO0VBQ3RCOztFQUVBO0FBQ0Y7QUFDQTtFQUNFLE1BQU1HLEtBQUtBLENBQUEsRUFBRztJQUNaLElBQUksQ0FBQyxJQUFJLENBQUMxQyxFQUFFLEVBQUU7TUFDWjtJQUNGO0lBQ0EsSUFBSTtNQUNGLE1BQU15QixPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUNrQixZQUFZLENBQUMsUUFBUSxDQUFDO01BQ2pELElBQUksQ0FBQzNDLEVBQUUsR0FBRyxJQUFJO01BQ2QsSUFBSSxDQUFDd0IsSUFBSSxDQUFDLE9BQU8sRUFBRUMsT0FBTyxDQUFDO01BQzNCLE9BQU9BLE9BQU87SUFDaEIsQ0FBQyxDQUFDLE9BQU9DLEdBQUcsRUFBRTtNQUNaLElBQUksQ0FBQ0YsSUFBSSxDQUFDLE9BQU8sRUFBRUUsR0FBRyxDQUFDO01BQ3ZCLE1BQU1BLEdBQUc7SUFDWDtFQUNGOztFQUVBO0FBQ0Y7QUFDQTtFQUNFLE1BQU1rQixLQUFLQSxDQUFBLEVBQUc7SUFDWixJQUFJLENBQUMsSUFBSSxDQUFDNUMsRUFBRSxFQUFFO01BQ1o7SUFDRjtJQUNBLElBQUk7TUFDRixNQUFNeUIsT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDa0IsWUFBWSxDQUFDLFNBQVMsQ0FBQztNQUNsRCxJQUFJLENBQUMzQyxFQUFFLEdBQUcsSUFBSTtNQUNkLElBQUksQ0FBQ3dCLElBQUksQ0FBQyxPQUFPLEVBQUVDLE9BQU8sQ0FBQztNQUMzQixPQUFPQSxPQUFPO0lBQ2hCLENBQUMsQ0FBQyxPQUFPQyxHQUFHLEVBQUU7TUFDWixJQUFJLENBQUNGLElBQUksQ0FBQyxPQUFPLEVBQUVFLEdBQUcsQ0FBQztNQUN2QixNQUFNQSxHQUFHO0lBQ1g7RUFDRjs7RUFFQTtBQUNGO0FBQ0E7RUFDRSxNQUFNaUIsWUFBWUEsQ0FBQzFDLEtBQWUsRUFBRTtJQUNsQyxNQUFNUCxJQUFJLEdBQUcsSUFBSSxDQUFDSyxLQUFLO0lBQ3ZCLE1BQU1nQyxNQUFNLEdBQUdyQyxJQUFJLENBQUNzQyxPQUFPO0lBRTNCLElBQUksQ0FBQ3pCLFFBQVEsR0FBRyxDQUFDLFlBQVk7TUFBQSxJQUFBc0MsU0FBQTtNQUMzQixNQUFNL0MsS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDbUMsS0FBSyxDQUFDLENBQUM7TUFDaEMsTUFBTXBCLElBQUksR0FBRyxJQUFBQyxLQUFBLENBQUE1QixPQUFBLEVBQUEyRCxTQUFBLEdBQUM7QUFDcEI7QUFDQTtBQUNBLFdBQVc1QyxLQUFNO0FBQ2pCO0FBQ0EsT0FBTyxFQUFBaEMsSUFBQSxDQUFBNEUsU0FBTSxDQUFDO01BQ1IsTUFBTTNCLEdBQUcsR0FBRyxNQUFNeEIsSUFBSSxDQUFDeUIsUUFBUSxDQUFrQjtRQUMvQ0MsTUFBTSxFQUFFLE1BQU07UUFDZEMsSUFBSSxFQUFFLE9BQU8sR0FBR3ZCLEtBQUs7UUFDckJlLElBQUksRUFBRUEsSUFBSTtRQUNWUyxPQUFPLEVBQUU7VUFDUCxjQUFjLEVBQUU7UUFDbEIsQ0FBQztRQUNEQyxZQUFZLEVBQUU7TUFDaEIsQ0FBQyxDQUFDO01BQ0ZRLE1BQU0sQ0FBQ0csS0FBSyxDQUFDaEIsR0FBRyxDQUFDTyxPQUFPLENBQUM7TUFDekIsSUFBSSxDQUFDeEIsS0FBSyxHQUFHaUIsR0FBRyxDQUFDTyxPQUFPLENBQUN4QixLQUFLO01BQzlCLE9BQU9pQixHQUFHLENBQUNPLE9BQU87SUFDcEIsQ0FBQyxFQUFFLENBQUM7SUFDSixPQUFPLElBQUksQ0FBQ2xCLFFBQVE7RUFDdEI7QUFDRjs7QUFFQTtBQUFBdUMsT0FBQSxDQUFBdkQsR0FBQSxHQUFBQSxHQUFBO0FBQ0EsTUFBTXdELG1CQUFtQixTQUFTckMsS0FBSyxDQUFDO0VBSXRDO0FBQ0Y7QUFDQTtFQUNFakIsV0FBV0EsQ0FBQ3VELE9BQWUsRUFBRWxELEtBQWEsRUFBRWdDLE9BQWUsRUFBRTtJQUMzRCxLQUFLLENBQUNrQixPQUFPLENBQUM7SUFBQyxJQUFBL0QsZ0JBQUEsQ0FBQUMsT0FBQTtJQUFBLElBQUFELGdCQUFBLENBQUFDLE9BQUE7SUFDZixJQUFJLENBQUMrRCxJQUFJLEdBQUcsZ0JBQWdCO0lBQzVCLElBQUksQ0FBQ25ELEtBQUssR0FBR0EsS0FBSztJQUNsQixJQUFJLENBQUNnQyxPQUFPLEdBQUdBLE9BQU87RUFDeEI7QUFDRjtBQUVBLE1BQU1vQixzQkFBc0IsU0FBU3hDLEtBQUssQ0FBQztFQUd6QztBQUNGO0FBQ0E7RUFDRWpCLFdBQVdBLENBQUN1RCxPQUFlLEVBQUVsRCxLQUFhLEVBQUU7SUFDMUMsS0FBSyxDQUFDa0QsT0FBTyxDQUFDO0lBQUMsSUFBQS9ELGdCQUFBLENBQUFDLE9BQUE7SUFDZixJQUFJLENBQUMrRCxJQUFJLEdBQUcsbUJBQW1CO0lBQy9CLElBQUksQ0FBQ25ELEtBQUssR0FBR0EsS0FBSztFQUNwQjtBQUNGOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ08sTUFBTStCLEtBQUssU0FHUnNCLGdCQUFRLENBQUM7RUFVakI7QUFDRjtBQUNBO0VBQ0UxRCxXQUFXQSxDQUFDMkQsR0FBZ0IsRUFBRXBELEVBQVcsRUFBRTtJQUN6QyxLQUFLLENBQUM7TUFBRXFELFVBQVUsRUFBRTtJQUFLLENBQUMsQ0FBQztJQUFDLElBQUFwRSxnQkFBQSxDQUFBQyxPQUFBO0lBQUEsSUFBQUQsZ0JBQUEsQ0FBQUMsT0FBQTtJQUFBLElBQUFELGdCQUFBLENBQUFDLE9BQUE7SUFBQSxJQUFBRCxnQkFBQSxDQUFBQyxPQUFBO0lBQUEsSUFBQUQsZ0JBQUEsQ0FBQUMsT0FBQTtJQUFBLElBQUFELGdCQUFBLENBQUFDLE9BQUE7SUFBQSxJQUFBRCxnQkFBQSxDQUFBQyxPQUFBO0lBQUEsSUFBQUQsZ0JBQUEsQ0FBQUMsT0FBQTtJQUFBLElBQUFELGdCQUFBLENBQUFDLE9BQUEsZUFrSXhCLElBQUksQ0FBQ29FLE9BQU87SUFBQSxJQUFBckUsZ0JBQUEsQ0FBQUMsT0FBQSxnQkFFWCxJQUFJLENBQUNvRSxPQUFPO0lBbklqQixJQUFJLENBQUNGLEdBQUcsR0FBR0EsR0FBRztJQUNkLElBQUksQ0FBQ3BELEVBQUUsR0FBR0EsRUFBRTtJQUNaLElBQUksQ0FBQ0QsS0FBSyxHQUFHcUQsR0FBRyxDQUFDckQsS0FBSzs7SUFFdEI7SUFDQSxJQUFJLENBQUNJLEVBQUUsQ0FBQyxPQUFPLEVBQUdDLEtBQUssSUFBTSxJQUFJLENBQUNDLE1BQU0sR0FBR0QsS0FBTSxDQUFDOztJQUVsRDtJQUNBO0lBQ0E7SUFDQSxNQUFNbUQsZ0JBQWdCLEdBQUc7TUFBRUMsU0FBUyxFQUFFO0lBQU8sQ0FBQztJQUM5QyxNQUFNQyxZQUFZLEdBQUksSUFBSSxDQUFDQyxhQUFhLEdBQUcsSUFBSUMsMEJBQVksQ0FBQyxDQUFFO0lBQzlELE1BQU1DLGdCQUFnQixHQUFHSCxZQUFZLENBQUNJLE1BQU0sQ0FBQyxLQUFLLEVBQUVOLGdCQUFnQixDQUFDO0lBQ3JFLE1BQU1PLGNBQWMsR0FBSSxJQUFJLENBQUNDLGVBQWUsR0FBRyxJQUFJQyxzQkFBUSxDQUFDLENBQUU7SUFDOUQsTUFBTUMsa0JBQWtCLEdBQUdILGNBQWMsQ0FBQ0QsTUFBTSxDQUFDLEtBQUssRUFBRU4sZ0JBQWdCLENBQUM7SUFFekUsSUFBSSxDQUFDcEQsRUFBRSxDQUFDLFFBQVEsRUFBRSxNQUFNc0QsWUFBWSxDQUFDUyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzNDTixnQkFBZ0IsQ0FBQ08sSUFBSSxDQUFDLFVBQVUsRUFBRSxZQUFZO01BQzVDLElBQUk7UUFDRjtRQUNBLE1BQU0sSUFBSSxDQUFDZixHQUFHLENBQUNuQixLQUFLLENBQUMsQ0FBQztRQUN0QjtRQUNBMkIsZ0JBQWdCLENBQUNRLElBQUksQ0FBQyxJQUFJLENBQUNDLG9CQUFvQixDQUFDLENBQUMsQ0FBQztNQUNwRCxDQUFDLENBQUMsT0FBTzNDLEdBQUcsRUFBRTtRQUNaLElBQUksQ0FBQ0YsSUFBSSxDQUFDLE9BQU8sRUFBRUUsR0FBRyxDQUFDO01BQ3pCO0lBQ0YsQ0FBQyxDQUFDOztJQUVGO0lBQ0EsSUFBSSxDQUFDNEMsV0FBVyxHQUFHLElBQUFDLDhCQUFxQixFQUN0Q1gsZ0JBQWdCLEVBQ2hCSyxrQkFDRixDQUFDO0VBQ0g7O0VBRUE7QUFDRjtBQUNBO0FBQ0E7QUFDQTtFQUNFSSxvQkFBb0JBLENBQUEsRUFBRztJQUNyQixNQUFNM0UsSUFBSSxHQUFHLElBQUksQ0FBQ0ssS0FBSztJQUN2QixNQUFNZ0MsTUFBTSxHQUFHckMsSUFBSSxDQUFDc0MsT0FBTztJQUMzQixNQUFNd0MsR0FBRyxHQUFHOUUsSUFBSSxDQUFDeUIsUUFBUSxDQUFvQjtNQUMzQ0MsTUFBTSxFQUFFLE1BQU07TUFDZEMsSUFBSSxFQUFFLE9BQU8sR0FBRyxJQUFJLENBQUMrQixHQUFHLENBQUNwRCxFQUFFLEdBQUcsUUFBUTtNQUN0Q3NCLE9BQU8sRUFBRTtRQUNQLGNBQWMsRUFBRTtNQUNsQixDQUFDO01BQ0RDLFlBQVksRUFBRTtJQUNoQixDQUFDLENBQUM7SUFDRixDQUFDLFlBQVk7TUFDWCxJQUFJO1FBQ0YsTUFBTUwsR0FBRyxHQUFHLE1BQU1zRCxHQUFHO1FBQ3JCekMsTUFBTSxDQUFDRyxLQUFLLENBQUNoQixHQUFHLENBQUNzQixTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDeEMsRUFBRSxHQUFHa0IsR0FBRyxDQUFDc0IsU0FBUyxDQUFDeEMsRUFBRTtRQUMxQixJQUFJLENBQUN3QixJQUFJLENBQUMsT0FBTyxFQUFFTixHQUFHLENBQUNzQixTQUFTLENBQUM7TUFDbkMsQ0FBQyxDQUFDLE9BQU9kLEdBQUcsRUFBRTtRQUNaLElBQUksQ0FBQ0YsSUFBSSxDQUFDLE9BQU8sRUFBRUUsR0FBRyxDQUFDO01BQ3pCO0lBQ0YsQ0FBQyxFQUFFLENBQUM7SUFDSixPQUFPOEMsR0FBRyxDQUFDWCxNQUFNLENBQUMsQ0FBQztFQUNyQjs7RUFFQTtBQUNGO0FBQ0E7RUFDRVksTUFBTUEsQ0FBQ0MsT0FBZSxFQUFFQyxHQUFXLEVBQUVDLEVBQWMsRUFBRTtJQUNuRCxNQUFNO1FBQUVDLEVBQUU7UUFBRWxGLElBQUk7UUFBRW1GO01BQW9CLENBQUMsR0FBR0osT0FBTztNQUFoQkssSUFBSSxPQUFBQyx5QkFBQSxDQUFBOUYsT0FBQSxFQUFLd0YsT0FBTztJQUNqRCxJQUFJTyxNQUFNO0lBQ1YsUUFBUSxJQUFJLENBQUM3QixHQUFHLENBQUN4RCxTQUFTO01BQ3hCLEtBQUssUUFBUTtRQUNYcUYsTUFBTSxHQUFHRixJQUFJO1FBQ2I7TUFDRixLQUFLLFFBQVE7TUFDYixLQUFLLFlBQVk7UUFDZkUsTUFBTSxHQUFHO1VBQUVKO1FBQUcsQ0FBQztRQUNmO01BQ0Y7UUFDRUksTUFBTSxHQUFBMUcsYUFBQTtVQUFLc0c7UUFBRSxHQUFLRSxJQUFJLENBQUU7SUFDNUI7SUFDQSxJQUFJLENBQUNyQixhQUFhLENBQUN3QixLQUFLLENBQUNELE1BQU0sRUFBRU4sR0FBRyxFQUFFQyxFQUFFLENBQUM7RUFDM0M7O0VBRUE7QUFDRjtBQUNBO0VBQ0VmLE1BQU1BLENBQUEsRUFBRztJQUNQLE9BQU8sSUFBSSxDQUFDUyxXQUFXO0VBQ3pCOztFQUVBO0FBQ0Y7QUFDQTtFQUNFaEIsT0FBT0EsQ0FBQzZCLEtBQW9DLEVBQUU7SUFDNUM7SUFDQSxJQUFJLElBQUksQ0FBQ0MsT0FBTyxFQUFFO01BQ2hCLE1BQU0sSUFBSTFFLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQztJQUM1QztJQUVBLElBQUksQ0FBQzBFLE9BQU8sR0FBRyxJQUFBakQsUUFBQSxDQUFBakQsT0FBQSxDQUFZLENBQUNrRCxPQUFPLEVBQUVpRCxNQUFNLEtBQUs7TUFDOUMsSUFBSSxDQUFDbEIsSUFBSSxDQUFDLFVBQVUsRUFBRS9CLE9BQU8sQ0FBQztNQUM5QixJQUFJLENBQUMrQixJQUFJLENBQUMsT0FBTyxFQUFFa0IsTUFBTSxDQUFDO0lBQzVCLENBQUMsQ0FBQztJQUVGLElBQUksSUFBQUMsa0JBQVEsRUFBQ0gsS0FBSyxDQUFDLElBQUksTUFBTSxJQUFJQSxLQUFLLElBQUksSUFBQUksb0JBQVUsRUFBQ0osS0FBSyxDQUFDZixJQUFJLENBQUMsRUFBRTtNQUNoRTtNQUNBZSxLQUFLLENBQUNmLElBQUksQ0FBQyxJQUFJLENBQUNFLFdBQVcsQ0FBQztJQUM5QixDQUFDLE1BQU07TUFDTCxJQUFJLElBQUE3QixRQUFBLENBQUF2RCxPQUFBLEVBQWNpRyxLQUFLLENBQUMsRUFBRTtRQUN4QixLQUFLLE1BQU1GLE1BQU0sSUFBSUUsS0FBSyxFQUFFO1VBQzFCLEtBQUssTUFBTW5HLEdBQUcsSUFBSSxJQUFBd0csS0FBQSxDQUFBdEcsT0FBQSxFQUFZK0YsTUFBTSxDQUFDLEVBQUU7WUFDckMsSUFBSSxPQUFPQSxNQUFNLENBQUNqRyxHQUFHLENBQUMsS0FBSyxTQUFTLEVBQUU7Y0FDcENpRyxNQUFNLENBQUNqRyxHQUFHLENBQUMsR0FBR3lHLE1BQU0sQ0FBQ1IsTUFBTSxDQUFDakcsR0FBRyxDQUFDLENBQUM7WUFDbkM7VUFDRjtVQUNBLElBQUksQ0FBQ2tHLEtBQUssQ0FBQ0QsTUFBTSxDQUFDO1FBQ3BCO1FBQ0EsSUFBSSxDQUFDZixHQUFHLENBQUMsQ0FBQztNQUNaLENBQUMsTUFBTSxJQUFJLE9BQU9pQixLQUFLLEtBQUssUUFBUSxFQUFFO1FBQ3BDLElBQUksQ0FBQ2IsV0FBVyxDQUFDWSxLQUFLLENBQUNDLEtBQUssRUFBRSxNQUFNLENBQUM7UUFDckMsSUFBSSxDQUFDYixXQUFXLENBQUNKLEdBQUcsQ0FBQyxDQUFDO01BQ3hCO0lBQ0Y7O0lBRUE7SUFDQSxPQUFPLElBQUk7RUFDYjtFQU1BO0FBQ0Y7QUFDQTtBQUNBO0VBQ0U3QixJQUFJQSxDQUNGcUQsVUFBMkMsRUFDM0NDLFFBQTRCLEVBQzVCO0lBQ0EsSUFBSSxDQUFDLElBQUksQ0FBQ1AsT0FBTyxFQUFFO01BQ2pCLElBQUksQ0FBQzlCLE9BQU8sQ0FBQyxDQUFDO0lBQ2hCO0lBQ0EsT0FBTyxJQUFJLENBQUM4QixPQUFPLENBQUUvQyxJQUFJLENBQUNxRCxVQUFVLEVBQUVDLFFBQVEsQ0FBQztFQUNqRDs7RUFFQTtBQUNGO0FBQ0E7RUFDRSxNQUFNbkYsS0FBS0EsQ0FBQSxFQUFHO0lBQ1osTUFBTWQsSUFBSSxHQUFHLElBQUksQ0FBQ0ssS0FBSztJQUN2QixNQUFNZ0MsTUFBTSxHQUFHckMsSUFBSSxDQUFDc0MsT0FBTztJQUMzQixNQUFNbEMsS0FBSyxHQUFHLElBQUksQ0FBQ3NELEdBQUcsQ0FBQ3BELEVBQUU7SUFDekIsTUFBTThCLE9BQU8sR0FBRyxJQUFJLENBQUM5QixFQUFFO0lBRXZCLElBQUksQ0FBQ0YsS0FBSyxJQUFJLENBQUNnQyxPQUFPLEVBQUU7TUFDdEIsTUFBTSxJQUFJcEIsS0FBSyxDQUFDLG9CQUFvQixDQUFDO0lBQ3ZDO0lBQ0EsTUFBTVEsR0FBRyxHQUFHLE1BQU14QixJQUFJLENBQUN5QixRQUFRLENBQW9CO01BQ2pEQyxNQUFNLEVBQUUsS0FBSztNQUNiQyxJQUFJLEVBQUUsT0FBTyxHQUFHdkIsS0FBSyxHQUFHLFNBQVMsR0FBR2dDLE9BQU87TUFDM0NQLFlBQVksRUFBRTtJQUNoQixDQUFDLENBQUM7SUFDRlEsTUFBTSxDQUFDRyxLQUFLLENBQUNoQixHQUFHLENBQUNzQixTQUFTLENBQUM7SUFDM0IsT0FBT3RCLEdBQUcsQ0FBQ3NCLFNBQVM7RUFDdEI7O0VBRUE7QUFDRjtBQUNBO0VBQ0VvRCxJQUFJQSxDQUFDQyxRQUFnQixFQUFFQyxPQUFlLEVBQUU7SUFDdEMsTUFBTWhHLEtBQUssR0FBRyxJQUFJLENBQUNzRCxHQUFHLENBQUNwRCxFQUFFO0lBQ3pCLE1BQU04QixPQUFPLEdBQUcsSUFBSSxDQUFDOUIsRUFBRTtJQUV2QixJQUFJLENBQUNGLEtBQUssSUFBSSxDQUFDZ0MsT0FBTyxFQUFFO01BQ3RCLE1BQU0sSUFBSXBCLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQztJQUN2QztJQUNBLE1BQU1xRixTQUFTLEdBQUcsSUFBSUMsSUFBSSxDQUFDLENBQUMsQ0FBQ0MsT0FBTyxDQUFDLENBQUM7SUFDdEMsTUFBTUwsSUFBSSxHQUFHLE1BQUFBLENBQUEsS0FBWTtNQUN2QixNQUFNTSxHQUFHLEdBQUcsSUFBSUYsSUFBSSxDQUFDLENBQUMsQ0FBQ0MsT0FBTyxDQUFDLENBQUM7TUFDaEMsSUFBSUYsU0FBUyxHQUFHRCxPQUFPLEdBQUdJLEdBQUcsRUFBRTtRQUM3QixNQUFNeEUsR0FBRyxHQUFHLElBQUlxQixtQkFBbUIsQ0FDakMsNkJBQTZCLEdBQUdqRCxLQUFLLEdBQUcsZ0JBQWdCLEdBQUdnQyxPQUFPLEVBQ2xFaEMsS0FBSyxFQUNMZ0MsT0FDRixDQUFDO1FBQ0QsSUFBSSxDQUFDTixJQUFJLENBQUMsT0FBTyxFQUFFRSxHQUFHLENBQUM7UUFDdkI7TUFDRjtNQUNBLElBQUlSLEdBQUc7TUFDUCxJQUFJO1FBQ0ZBLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQ1YsS0FBSyxDQUFDLENBQUM7TUFDMUIsQ0FBQyxDQUFDLE9BQU9rQixHQUFHLEVBQUU7UUFDWixJQUFJLENBQUNGLElBQUksQ0FBQyxPQUFPLEVBQUVFLEdBQUcsQ0FBQztRQUN2QjtNQUNGO01BQ0EsSUFBSVIsR0FBRyxDQUFDakIsS0FBSyxLQUFLLFFBQVEsRUFBRTtRQUMxQixJQUFJLElBQUFrRyxVQUFBLENBQUFqSCxPQUFBLEVBQVNnQyxHQUFHLENBQUNrRixzQkFBc0IsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUU7VUFDaEQsSUFBSSxDQUFDQyxRQUFRLENBQUMsQ0FBQztRQUNqQixDQUFDLE1BQU07VUFDTCxJQUFJLENBQUM3RSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUlkLEtBQUssQ0FBQ1EsR0FBRyxDQUFDb0YsWUFBWSxDQUFDLENBQUM7UUFDakQ7TUFDRixDQUFDLE1BQU0sSUFBSXBGLEdBQUcsQ0FBQ2pCLEtBQUssS0FBSyxXQUFXLEVBQUU7UUFDcEMsSUFBSSxDQUFDb0csUUFBUSxDQUFDLENBQUM7TUFDakIsQ0FBQyxNQUFNO1FBQ0wsSUFBSSxDQUFDN0UsSUFBSSxDQUFDLFVBQVUsRUFBRU4sR0FBRyxDQUFDO1FBQzFCLElBQUFxRixZQUFBLENBQUFySCxPQUFBLEVBQVcwRyxJQUFJLEVBQUVDLFFBQVEsQ0FBQztNQUM1QjtJQUNGLENBQUM7SUFDRCxJQUFBVSxZQUFBLENBQUFySCxPQUFBLEVBQVcwRyxJQUFJLEVBQUVDLFFBQVEsQ0FBQztFQUM1Qjs7RUFFQTtBQUNGO0FBQ0E7RUFDRSxNQUFNUSxRQUFRQSxDQUFBLEVBQUc7SUFDZixNQUFNM0csSUFBSSxHQUFHLElBQUksQ0FBQ0ssS0FBSztJQUN2QixNQUFNRCxLQUFLLEdBQUcsSUFBSSxDQUFDc0QsR0FBRyxDQUFDcEQsRUFBRTtJQUN6QixNQUFNb0QsR0FBRyxHQUFHLElBQUksQ0FBQ0EsR0FBRztJQUNwQixNQUFNdEIsT0FBTyxHQUFHLElBQUksQ0FBQzlCLEVBQUU7SUFFdkIsSUFBSSxDQUFDRixLQUFLLElBQUksQ0FBQ2dDLE9BQU8sRUFBRTtNQUN0QixNQUFNLElBQUlwQixLQUFLLENBQUMsb0JBQW9CLENBQUM7SUFDdkM7SUFFQSxJQUFJO01BQ0YsTUFBTThGLElBQUksR0FBRyxNQUFNOUcsSUFBSSxDQUFDeUIsUUFBUSxDQUU5QjtRQUNBQyxNQUFNLEVBQUUsS0FBSztRQUNiQyxJQUFJLEVBQUUsT0FBTyxHQUFHdkIsS0FBSyxHQUFHLFNBQVMsR0FBR2dDLE9BQU8sR0FBRztNQUNoRCxDQUFDLENBQUM7TUFDRixJQUFJMkUsT0FBcUQ7TUFDekQsSUFBSXJELEdBQUcsQ0FBQ3hELFNBQVMsS0FBSyxPQUFPLElBQUl3RCxHQUFHLENBQUN4RCxTQUFTLEtBQUssVUFBVSxFQUFFO1FBQUEsSUFBQThHLFNBQUE7UUFDN0QsTUFBTXhGLEdBQUcsR0FBR3NGLElBQStCO1FBQzNDLElBQUlHLFFBQVEsR0FBR3pGLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQzBGLE1BQU07UUFDeENILE9BQU8sR0FBRyxJQUFBSSxJQUFBLENBQUEzSCxPQUFBLEVBQUF3SCxTQUFBLEdBQUMsSUFBQWpFLFFBQUEsQ0FBQXZELE9BQUEsRUFBY3lILFFBQVEsQ0FBQyxHQUM5QkEsUUFBUSxHQUNSLENBQUNBLFFBQVEsQ0FBQyxFQUFBMUksSUFBQSxDQUFBeUksU0FBQSxFQUNQMUcsRUFBRSxLQUFNO1VBQUVBLEVBQUU7VUFBRThCLE9BQU87VUFBRWhDO1FBQU0sQ0FBQyxDQUFDLENBQUM7TUFDekMsQ0FBQyxNQUFNO1FBQ0wsTUFBTW9CLEdBQUcsR0FBR3NGLElBQWdDO1FBQzVDQyxPQUFPLEdBQUcsSUFBQUksSUFBQSxDQUFBM0gsT0FBQSxFQUFBZ0MsR0FBRyxFQUFBakQsSUFBQSxDQUFIaUQsR0FBRyxFQUFNNEYsR0FBRyxLQUFNO1VBQzFCOUcsRUFBRSxFQUFFOEcsR0FBRyxDQUFDakMsRUFBRSxJQUFJLElBQUk7VUFDbEJrQyxPQUFPLEVBQUVELEdBQUcsQ0FBQ0UsT0FBTyxLQUFLLE1BQU07VUFDL0JDLE1BQU0sRUFBRUgsR0FBRyxDQUFDcEcsS0FBSyxHQUFHLENBQUNvRyxHQUFHLENBQUNwRyxLQUFLLENBQUMsR0FBRztRQUNwQyxDQUFDLENBQUMsQ0FBQztNQUNMO01BQ0EsSUFBSSxDQUFDYyxJQUFJLENBQUMsVUFBVSxFQUFFaUYsT0FBTyxDQUFDO01BQzlCLE9BQU9BLE9BQU87SUFDaEIsQ0FBQyxDQUFDLE9BQU8vRSxHQUFHLEVBQUU7TUFDWixJQUFJLENBQUNGLElBQUksQ0FBQyxPQUFPLEVBQUVFLEdBQUcsQ0FBQztNQUN2QixNQUFNQSxHQUFHO0lBQ1g7RUFDRjs7RUFFQTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0VBQ0VrRixNQUFNQSxDQUFDRCxRQUFnQixFQUFFO0lBQ3ZCLE1BQU03RyxLQUFLLEdBQUcsSUFBSSxDQUFDc0QsR0FBRyxDQUFDcEQsRUFBRTtJQUN6QixNQUFNOEIsT0FBTyxHQUFHLElBQUksQ0FBQzlCLEVBQUU7SUFDdkIsSUFBSSxDQUFDRixLQUFLLElBQUksQ0FBQ2dDLE9BQU8sRUFBRTtNQUN0QixNQUFNLElBQUlwQixLQUFLLENBQUMsb0JBQW9CLENBQUM7SUFDdkM7SUFDQSxNQUFNd0csWUFBWSxHQUFHLElBQUlsRCxzQkFBUSxDQUFDLENBQUM7SUFDbkMsTUFBTW1ELGdCQUFnQixHQUFHRCxZQUFZLENBQUNyRCxNQUFNLENBQUMsS0FBSyxDQUFDO0lBQ25ELElBQUksQ0FBQzlELEtBQUssQ0FDUG9CLFFBQVEsQ0FBQztNQUNSQyxNQUFNLEVBQUUsS0FBSztNQUNiQyxJQUFJLEVBQUUsT0FBTyxHQUFHdkIsS0FBSyxHQUFHLFNBQVMsR0FBR2dDLE9BQU8sR0FBRyxVQUFVLEdBQUc2RSxRQUFRO01BQ25FcEYsWUFBWSxFQUFFO0lBQ2hCLENBQUMsQ0FBQyxDQUNEc0MsTUFBTSxDQUFDLENBQUMsQ0FDUk8sSUFBSSxDQUFDK0MsZ0JBQWdCLENBQUM7SUFDekIsT0FBT0QsWUFBWTtFQUNyQjtBQUNGOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBRkFwRSxPQUFBLENBQUFqQixLQUFBLEdBQUFBLEtBQUE7QUFHQSxNQUFNdUYsT0FBTyxTQUEyQkMsZ0JBQU8sQ0FBSTtFQUNqREMsVUFBVUEsQ0FBQ0MsT0FBb0IsRUFBRTtJQUFBLElBQUFDLHFCQUFBO0lBQy9CRCxPQUFPLENBQUNqRyxPQUFPLEdBQUEvQyxhQUFBLENBQUFBLGFBQUEsS0FDVmdKLE9BQU8sQ0FBQ2pHLE9BQU87TUFDbEIsZ0JBQWdCLEdBQUFrRyxxQkFBQSxHQUFFLElBQUksQ0FBQ0MsS0FBSyxDQUFDQyxXQUFXLGNBQUFGLHFCQUFBLGNBQUFBLHFCQUFBLEdBQUk7SUFBRSxFQUMvQztFQUNIO0VBRUFHLGdCQUFnQkEsQ0FBQ0MsUUFBc0IsRUFBRTtJQUN2QyxPQUNFQSxRQUFRLENBQUNDLFVBQVUsS0FBSyxHQUFHLElBQzNCLGtEQUFrRCxDQUFDQyxJQUFJLENBQUNGLFFBQVEsQ0FBQy9HLElBQUksQ0FBQztFQUUxRTtFQUVBa0gsc0JBQXNCQSxDQUFDbEgsSUFBUyxFQUFFO0lBQ2hDLE9BQU8sQ0FBQyxDQUFDQSxJQUFJLENBQUNULEtBQUs7RUFDckI7RUFFQTRILFVBQVVBLENBQUNuSCxJQUFTLEVBQUU7SUFDcEIsT0FBTztNQUNMb0gsU0FBUyxFQUFFcEgsSUFBSSxDQUFDVCxLQUFLLENBQUM4SCxhQUFhO01BQ25DbEYsT0FBTyxFQUFFbkMsSUFBSSxDQUFDVCxLQUFLLENBQUMrSDtJQUN0QixDQUFDO0VBQ0g7QUFDRjtBQUVBLE1BQU1DLFNBQVMsU0FBMkJmLGdCQUFPLENBQUk7RUFDbkRVLHNCQUFzQkEsQ0FBQ2xILElBQVMsRUFBRTtJQUNoQyxPQUNFLElBQUE0QixRQUFBLENBQUF2RCxPQUFBLEVBQWMyQixJQUFJLENBQUMsSUFDbkIsT0FBT0EsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLFFBQVEsSUFDM0IsV0FBVyxJQUFJQSxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBRTFCO0VBRUE4RyxnQkFBZ0JBLENBQUNDLFFBQXNCLEVBQVc7SUFDaEQsT0FDRUEsUUFBUSxDQUFDQyxVQUFVLEtBQUssR0FBRyxJQUFJLG9CQUFvQixDQUFDQyxJQUFJLENBQUNGLFFBQVEsQ0FBQy9HLElBQUksQ0FBQztFQUUzRTtFQUVBbUgsVUFBVUEsQ0FBQ25ILElBQVMsRUFBRTtJQUNwQixPQUFPO01BQ0xvSCxTQUFTLEVBQUVwSCxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUNvSCxTQUFTO01BQzVCakYsT0FBTyxFQUFFbkMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDbUM7SUFDbkIsQ0FBQztFQUNIO0FBQ0Y7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNPLE1BQU1xRixJQUFJLENBQW1CO0VBSWxDO0FBQ0Y7QUFDQTs7RUFHRTtBQUNGO0FBQ0E7QUFDQTs7RUFHRTtBQUNGO0FBQ0E7RUFDRTVJLFdBQVdBLENBQUM2SSxJQUFtQixFQUFFO0lBQUEsSUFBQXJKLGdCQUFBLENBQUFDLE9BQUE7SUFBQSxJQUFBRCxnQkFBQSxDQUFBQyxPQUFBO0lBQUEsSUFBQUQsZ0JBQUEsQ0FBQUMsT0FBQSx3QkFYbEIsSUFBSTtJQUFBLElBQUFELGdCQUFBLENBQUFDLE9BQUEsdUJBTUwsS0FBSztJQU1qQixJQUFJLENBQUN1SSxLQUFLLEdBQUdhLElBQUk7SUFDakIsSUFBSSxDQUFDdEcsT0FBTyxHQUFHc0csSUFBSSxDQUFDdEcsT0FBTztFQUM3Qjs7RUFFQTtBQUNGO0FBQ0E7RUFDRWIsUUFBUUEsQ0FBSW9ILFFBQXFCLEVBQUU7SUFDakMsTUFBTUQsSUFBSSxHQUFHLElBQUksQ0FBQ2IsS0FBSztJQUN2QixNQUFNO1FBQUVwRyxJQUFJO1FBQUVFO01BQXNCLENBQUMsR0FBR2dILFFBQVE7TUFBakJDLElBQUksT0FBQXhELHlCQUFBLENBQUE5RixPQUFBLEVBQUtxSixRQUFRO0lBQ2hELE1BQU1FLE9BQU8sR0FBRyxDQUFDSCxJQUFJLENBQUNJLFdBQVcsRUFBRSxnQkFBZ0IsRUFBRUosSUFBSSxDQUFDSyxPQUFPLENBQUMsQ0FBQ0MsSUFBSSxDQUNyRSxHQUNGLENBQUM7SUFDRCxNQUFNckIsT0FBTyxHQUFBaEosYUFBQSxDQUFBQSxhQUFBLEtBQ1JpSyxJQUFJO01BQ1BLLEdBQUcsRUFBRUosT0FBTyxHQUFHcEg7SUFBSSxFQUNwQjtJQUNELE9BQU8sSUFBSStGLE9BQU8sQ0FBQyxJQUFJLENBQUNLLEtBQUssRUFBRTtNQUFFbEc7SUFBYSxDQUFDLENBQUMsQ0FBQ2dHLE9BQU8sQ0FBSUEsT0FBTyxDQUFDO0VBQ3RFOztFQUVBO0FBQ0Y7QUFDQTs7RUFZRXVCLElBQUlBLENBQ0ZuSixJQUFZLEVBQ1pDLFNBQWMsRUFDZG1KLGNBQTJELEVBQzNENUQsS0FBb0MsRUFDcEM7SUFDQSxJQUFJdEYsT0FBb0IsR0FBRyxDQUFDLENBQUM7SUFDN0IsSUFDRSxPQUFPa0osY0FBYyxLQUFLLFFBQVEsSUFDbEMsSUFBQXRHLFFBQUEsQ0FBQXZELE9BQUEsRUFBYzZKLGNBQWMsQ0FBQyxJQUM1QixJQUFBekQsa0JBQVEsRUFBQ3lELGNBQWMsQ0FBQyxJQUN2QixNQUFNLElBQUlBLGNBQWMsSUFDeEIsT0FBT0EsY0FBYyxDQUFDM0UsSUFBSSxLQUFLLFVBQVcsRUFDNUM7TUFDQTtNQUNBZSxLQUFLLEdBQUc0RCxjQUFjO0lBQ3hCLENBQUMsTUFBTTtNQUNMbEosT0FBTyxHQUFHa0osY0FBNkI7SUFDekM7SUFDQSxNQUFNM0YsR0FBRyxHQUFHLElBQUksQ0FBQzRGLFNBQVMsQ0FBQ3JKLElBQUksRUFBRUMsU0FBUyxFQUFFQyxPQUFPLENBQUM7SUFDcEQsTUFBTStCLEtBQUssR0FBR3dCLEdBQUcsQ0FBQ3pCLFdBQVcsQ0FBQyxDQUFDO0lBQy9CLE1BQU1zSCxPQUFPLEdBQUdBLENBQUEsS0FBTTdGLEdBQUcsQ0FBQ1YsS0FBSyxDQUFDLENBQUM7SUFDakMsTUFBTXdHLGNBQWMsR0FBSXhILEdBQVUsSUFBSztNQUNyQyxJQUFJQSxHQUFHLENBQUN1QixJQUFJLEtBQUssZ0JBQWdCLEVBQUU7UUFDakNnRyxPQUFPLENBQUMsQ0FBQztNQUNYO0lBQ0YsQ0FBQztJQUNEckgsS0FBSyxDQUFDekIsRUFBRSxDQUFDLFVBQVUsRUFBRThJLE9BQU8sQ0FBQztJQUM3QnJILEtBQUssQ0FBQ3pCLEVBQUUsQ0FBQyxPQUFPLEVBQUUrSSxjQUFjLENBQUM7SUFDakN0SCxLQUFLLENBQUN6QixFQUFFLENBQUMsT0FBTyxFQUFFLE1BQU07TUFDdEJ5QixLQUFLLGFBQUxBLEtBQUssdUJBQUxBLEtBQUssQ0FBRWdFLElBQUksQ0FBQyxJQUFJLENBQUN1RCxZQUFZLEVBQUUsSUFBSSxDQUFDQyxXQUFXLENBQUM7SUFDbEQsQ0FBQyxDQUFDO0lBQ0YsT0FBT3hILEtBQUssQ0FBQzBCLE9BQU8sQ0FBQzZCLEtBQUssQ0FBQztFQUM3Qjs7RUFFQTtBQUNGO0FBQ0E7RUFDRWtFLEtBQUtBLENBQUNDLElBQVksRUFBRTtJQUNsQixNQUFNQyxDQUFDLEdBQUdELElBQUksQ0FBQ0UsT0FBTyxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUMsQ0FBQ0MsS0FBSyxDQUFDLGVBQWUsQ0FBQztJQUNqRSxJQUFJLENBQUNGLENBQUMsRUFBRTtNQUNOLE1BQU0sSUFBSTdJLEtBQUssQ0FDYiwrREFDRixDQUFDO0lBQ0g7SUFDQSxNQUFNZixJQUFJLEdBQUc0SixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pCLE1BQU1HLFlBQVksR0FBRyxJQUFJMUYsc0JBQVEsQ0FBQyxDQUFDO0lBQ25DLE1BQU0yRixVQUFVLEdBQUdELFlBQVksQ0FBQzdGLE1BQU0sQ0FBQyxLQUFLLENBQUM7SUFDN0MsQ0FBQyxZQUFZO01BQ1gsSUFBSTtRQUNGLE1BQU00QyxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUNxQyxJQUFJLENBQUNuSixJQUFJLEVBQUUsT0FBTyxFQUFFMkosSUFBSSxDQUFDO1FBQ3BELE1BQU1NLE9BQU8sR0FBRyxJQUFBL0MsSUFBQSxDQUFBM0gsT0FBQSxFQUFBdUgsT0FBTyxFQUFBeEksSUFBQSxDQUFQd0ksT0FBTyxFQUFNRyxNQUFNLElBQ2pDLElBQUksQ0FBQ3hELEdBQUcsQ0FBQ3dELE1BQU0sQ0FBQzlHLEtBQUssQ0FBQyxDQUNuQjhCLEtBQUssQ0FBQ2dGLE1BQU0sQ0FBQzlFLE9BQU8sQ0FBQyxDQUNyQjhFLE1BQU0sQ0FBQ0EsTUFBTSxDQUFDNUcsRUFBRSxDQUFDLENBQ2pCNkQsTUFBTSxDQUFDLENBQ1osQ0FBQztRQUNELElBQUFnRyxvQkFBVyxFQUFDRCxPQUFPLENBQUMsQ0FBQ3hGLElBQUksQ0FBQ3VGLFVBQVUsQ0FBQztNQUN2QyxDQUFDLENBQUMsT0FBT2pJLEdBQUcsRUFBRTtRQUNaZ0ksWUFBWSxDQUFDbEksSUFBSSxDQUFDLE9BQU8sRUFBRUUsR0FBRyxDQUFDO01BQ2pDO0lBQ0YsQ0FBQyxFQUFFLENBQUM7SUFDSixPQUFPZ0ksWUFBWTtFQUNyQjs7RUFFQTtBQUNGO0FBQ0E7RUFDRVYsU0FBU0EsQ0FDUHJKLElBQVksRUFDWkMsU0FBYyxFQUNkQyxPQUFvQixHQUFHLENBQUMsQ0FBQyxFQUN6QjtJQUNBLE9BQU8sSUFBSU4sR0FBRyxDQUFDLElBQUksRUFBRUksSUFBSSxFQUFFQyxTQUFTLEVBQUVDLE9BQU8sQ0FBQztFQUNoRDs7RUFFQTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7RUFDRXVELEdBQUdBLENBQTRCdEQsS0FBYSxFQUFFO0lBQzVDLE9BQU8sSUFBSVAsR0FBRyxDQUFTLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRU8sS0FBSyxDQUFDO0VBQ3ZEO0FBQ0Y7QUFBQ2dELE9BQUEsQ0FBQXVGLElBQUEsR0FBQUEsSUFBQTtBQUFBLElBQUF5QixXQUFBLE9BQUFDLFFBQUEsQ0FBQTdLLE9BQUE7QUFFTSxNQUFNOEssTUFBTSxDQUFtQjtFQUdwQztBQUNGO0FBQ0E7O0VBR0U7QUFDRjtBQUNBO0FBQ0E7O0VBR0V2SyxXQUFXQSxDQUFDd0ssVUFBeUIsRUFBRTtJQUFBSCxXQUFBLENBQUFJLEdBQUE7TUFBQUMsUUFBQTtNQUFBQyxLQUFBO0lBQUE7SUFBQSxJQUFBbkwsZ0JBQUEsQ0FBQUMsT0FBQSx3QkFSeEIsSUFBSTtJQUFBLElBQUFELGdCQUFBLENBQUFDLE9BQUEsdUJBTUwsS0FBSztJQUdqQixJQUFBbUwsc0JBQUEsQ0FBQW5MLE9BQUEsTUFBSSxFQUFBNEssV0FBQSxFQUFlRyxVQUFVO0VBQy9COztFQUVBO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0VBQ0VqQixTQUFTQSxDQUNQbkosT0FBNEIsRUFDUDtJQUNyQixPQUFPLElBQUl5SyxXQUFXLENBQUM7TUFDckJMLFVBQVUsTUFBQU0sc0JBQUEsQ0FBQXJMLE9BQUEsRUFBRSxJQUFJLEVBQUE0SyxXQUFBLENBQVk7TUFDNUJySSxPQUFPLEVBQUU1QixPQUFPO01BQ2hCMkssY0FBYyxFQUFFO0lBQ2xCLENBQUMsQ0FBQztFQUNKOztFQUVBO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtFQUNFcEgsR0FBR0EsQ0FDRHZELE9BQWlDLEVBQ1o7SUFDckIsT0FBTyxJQUFJeUssV0FBVyxDQUFDO01BQ3JCTCxVQUFVLE1BQUFNLHNCQUFBLENBQUFyTCxPQUFBLEVBQUUsSUFBSSxFQUFBNEssV0FBQSxDQUFZO01BQzVCckksT0FBTyxFQUFFNUIsT0FBTztNQUNoQjJLLGNBQWMsRUFBRTtJQUNsQixDQUFDLENBQUM7RUFDSjs7RUFFQTtBQUNGO0FBQ0E7RUFDRSxNQUFNQyxxQkFBcUJBLENBQ3pCNUssT0FHRyxFQUM2QjtJQUNoQyxJQUFJLENBQUNBLE9BQU8sQ0FBQ3VKLFdBQVcsRUFBRXZKLE9BQU8sQ0FBQ3VKLFdBQVcsR0FBRyxJQUFJLENBQUNBLFdBQVc7SUFDaEUsSUFBSSxDQUFDdkosT0FBTyxDQUFDc0osWUFBWSxFQUFFdEosT0FBTyxDQUFDc0osWUFBWSxHQUFHLElBQUksQ0FBQ0EsWUFBWTtJQUVuRSxNQUFNL0YsR0FBRyxHQUFHLElBQUksQ0FBQzRGLFNBQVMsQ0FBQ25KLE9BQU8sQ0FBQztJQUNuQyxJQUFJO01BQ0YsTUFBTXVELEdBQUcsQ0FBQzNDLElBQUksQ0FBQyxDQUFDO01BQ2hCLE1BQU0yQyxHQUFHLENBQUNzSCxVQUFVLENBQUM3SyxPQUFPLENBQUNzRixLQUFLLENBQUM7TUFDbkMsTUFBTS9CLEdBQUcsQ0FBQ1YsS0FBSyxDQUFDLENBQUM7TUFDakIsTUFBTVUsR0FBRyxDQUFDd0MsSUFBSSxDQUFDL0YsT0FBTyxDQUFDc0osWUFBWSxFQUFFdEosT0FBTyxDQUFDdUosV0FBVyxDQUFDO01BQ3pELE9BQU8sTUFBTWhHLEdBQUcsQ0FBQ3VILGFBQWEsQ0FBQyxDQUFDO0lBQ2xDLENBQUMsQ0FBQyxPQUFPakosR0FBRyxFQUFFO01BQ1osSUFBSUEsR0FBRyxDQUFDdUIsSUFBSSxLQUFLLHdCQUF3QixFQUFFO1FBQ3pDO1FBQ0FHLEdBQUcsQ0FBQ3dILE1BQU0sQ0FBQyxDQUFDLENBQUNDLEtBQUssQ0FBRUMsT0FBTyxJQUFLQSxPQUFPLENBQUM7TUFDMUM7TUFDQSxNQUFNcEosR0FBRztJQUNYO0VBQ0Y7O0VBRUE7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7RUFDRSxNQUFNMkgsS0FBS0EsQ0FDVEMsSUFBWSxFQUNaekosT0FHQyxFQUNrQjtJQUNuQixNQUFNa0wsUUFBUSxHQUFHLElBQUlDLFVBQVUsQ0FBQztNQUM5QmYsVUFBVSxNQUFBTSxzQkFBQSxDQUFBckwsT0FBQSxFQUFFLElBQUksRUFBQTRLLFdBQUEsQ0FBWTtNQUM1QmxLLFNBQVMsRUFBRUMsT0FBTyxhQUFQQSxPQUFPLGVBQVBBLE9BQU8sQ0FBRW9MLE9BQU8sR0FBRyxVQUFVLEdBQUcsT0FBTztNQUNsRDVCLEtBQUssRUFBRUMsSUFBSTtNQUNYa0IsY0FBYyxFQUFFLElBQUk7TUFDcEJVLE9BQU8sRUFBRSxDQUFBckwsT0FBTyxhQUFQQSxPQUFPLHVCQUFQQSxPQUFPLENBQUVxTCxPQUFPLEtBQUk7SUFDL0IsQ0FBQyxDQUFDO0lBQ0YsSUFBSTtNQUNGLE1BQU1ILFFBQVEsQ0FBQ3RLLElBQUksQ0FBQyxDQUFDO01BQ3JCLE1BQU1zSyxRQUFRLENBQUNuRixJQUFJLENBQUMvRixPQUFPLGFBQVBBLE9BQU8sdUJBQVBBLE9BQU8sQ0FBRXNKLFlBQVksRUFBRXRKLE9BQU8sYUFBUEEsT0FBTyx1QkFBUEEsT0FBTyxDQUFFdUosV0FBVyxDQUFDO01BQ2hFLE9BQU8sTUFBTTJCLFFBQVEsQ0FBQ0ksVUFBVSxDQUFDLENBQUM7SUFDcEMsQ0FBQyxDQUFDLE9BQU96SixHQUFHLEVBQUU7TUFDWixJQUFJQSxHQUFHLENBQUN1QixJQUFJLEtBQUssd0JBQXdCLEVBQUU7UUFDekM7UUFDQThILFFBQVEsQ0FBQ0gsTUFBTSxDQUFDLENBQUMsQ0FBQ0MsS0FBSyxDQUFFQyxPQUFPLElBQUtBLE9BQU8sQ0FBQztNQUMvQztNQUNBLE1BQU1wSixHQUFHO0lBQ1g7RUFDRjtBQUNGO0FBQUNvQixPQUFBLENBQUFrSCxNQUFBLEdBQUFBLE1BQUE7QUFBQSxJQUFBb0IsWUFBQSxPQUFBckIsUUFBQSxDQUFBN0ssT0FBQTtBQUFBLElBQUFtTSxVQUFBLE9BQUF0QixRQUFBLENBQUE3SyxPQUFBO0FBQUEsSUFBQW9NLE1BQUEsT0FBQXZCLFFBQUEsQ0FBQTdLLE9BQUE7QUFBQSxJQUFBcU0sZUFBQSxPQUFBeEIsUUFBQSxDQUFBN0ssT0FBQTtBQUFBLElBQUFzTSxRQUFBLE9BQUF6QixRQUFBLENBQUE3SyxPQUFBO0FBQUEsSUFBQXVNLGFBQUEsT0FBQTFCLFFBQUEsQ0FBQTdLLE9BQUE7QUFBQSxJQUFBbUIsTUFBQSxPQUFBMEosUUFBQSxDQUFBN0ssT0FBQTtBQUVNLE1BQU04TCxVQUFVLFNBQTJCeEwsb0JBQVksQ0FBQztFQVk3REMsV0FBV0EsQ0FBQ0ksT0FBbUMsRUFBRTtJQUMvQyxLQUFLLENBQUMsQ0FBQztJQUFDdUwsWUFBQSxDQUFBbEIsR0FBQTtNQUFBQyxRQUFBO01BQUFDLEtBQUE7SUFBQTtJQUFBaUIsVUFBQSxDQUFBbkIsR0FBQTtNQUFBQyxRQUFBO01BQUFDLEtBQUE7SUFBQTtJQUFBa0IsTUFBQSxDQUFBcEIsR0FBQTtNQUFBQyxRQUFBO01BQUFDLEtBQUE7SUFBQTtJQUFBbUIsZUFBQSxDQUFBckIsR0FBQTtNQUFBQyxRQUFBO01BQUFDLEtBQUE7SUFBQTtJQUFBb0IsUUFBQSxDQUFBdEIsR0FBQTtNQUFBQyxRQUFBO01BQUFDLEtBQUE7SUFBQTtJQUFBcUIsYUFBQSxDQUFBdkIsR0FBQTtNQUFBQyxRQUFBO01BQUFDLEtBQUE7SUFBQTtJQUFBL0osTUFBQSxDQUFBNkosR0FBQTtNQUFBQyxRQUFBO01BQUFDLEtBQUE7SUFBQTtJQUFBLElBQUFuTCxnQkFBQSxDQUFBQyxPQUFBO0lBQUEsSUFBQUQsZ0JBQUEsQ0FBQUMsT0FBQTtJQUFBLElBQUFELGdCQUFBLENBQUFDLE9BQUEsb0JBSFUsS0FBSztJQUl2QixJQUFBbUwsc0JBQUEsQ0FBQW5MLE9BQUEsTUFBSSxFQUFBa00sWUFBQSxFQUFldkwsT0FBTyxDQUFDb0ssVUFBVTtJQUNyQyxJQUFBSSxzQkFBQSxDQUFBbkwsT0FBQSxNQUFJLEVBQUFtTSxVQUFBLEVBQWN4TCxPQUFPLENBQUNELFNBQVM7SUFDbkMsSUFBQXlLLHNCQUFBLENBQUFuTCxPQUFBLE1BQUksRUFBQW9NLE1BQUEsRUFBVXpMLE9BQU8sQ0FBQ3dKLEtBQUs7SUFDM0IsSUFBQWdCLHNCQUFBLENBQUFuTCxPQUFBLE1BQUksRUFBQXFNLGVBQUEsRUFBbUIxTCxPQUFPLENBQUMySyxjQUFjO0lBQzdDLElBQUFILHNCQUFBLENBQUFuTCxPQUFBLE1BQUksRUFBQXNNLFFBQUEsRUFBWTNMLE9BQU8sQ0FBQ3FMLE9BQU87SUFDL0I7SUFDQSxJQUFJLENBQUMvSyxFQUFFLENBQUMsT0FBTyxFQUFHQyxLQUFLLFFBQUFpSyxzQkFBQSxDQUFBbkwsT0FBQSxFQUFNLElBQUksRUFBQW1CLE1BQUEsRUFBVUQsS0FBSyxDQUFDLENBQUM7RUFDcEQ7O0VBRUE7QUFDRjtBQUNBO0VBQ0UsTUFBTUssSUFBSUEsQ0FBQSxFQUFrQjtJQUMxQixJQUFJO01BQ0YsSUFBSSxDQUFDZ0IsT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDaUssa0JBQWtCLENBQVk7UUFDdER0SyxNQUFNLEVBQUUsTUFBTTtRQUNkQyxJQUFJLEVBQUUsRUFBRTtRQUNSUixJQUFJLEVBQUUsSUFBQThLLFVBQUEsQ0FBQXpNLE9BQUEsRUFBZTtVQUNuQlUsU0FBUyxNQUFBMkssc0JBQUEsQ0FBQXJMLE9BQUEsRUFBRSxJQUFJLEVBQUFtTSxVQUFBLENBQVc7VUFDMUJoQyxLQUFLLE1BQUFrQixzQkFBQSxDQUFBckwsT0FBQSxFQUFFLElBQUksRUFBQW9NLE1BQUE7UUFDYixDQUFDLENBQUM7UUFDRmhLLE9BQU8sRUFBRTtVQUNQLGNBQWMsRUFBRTtRQUNsQixDQUFDO1FBQ0RDLFlBQVksRUFBRTtNQUNoQixDQUFDLENBQUM7TUFDRixJQUFJLENBQUNDLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDbkIsQ0FBQyxDQUFDLE9BQU9FLEdBQUcsRUFBRTtNQUNaLElBQUksQ0FBQ0YsSUFBSSxDQUFDLE9BQU8sRUFBRUUsR0FBRyxDQUFDO01BQ3ZCLE1BQU1BLEdBQUc7SUFDWDtFQUNGOztFQUVBO0FBQ0Y7QUFDQTtFQUNFLE1BQU1rQixLQUFLQSxDQUFBLEVBQWtCO0lBQzNCLElBQUk7TUFBQSxJQUFBZ0osYUFBQTtNQUNGLE1BQU0zTCxLQUFpQixHQUFHLFNBQVM7TUFDbkMsSUFBSSxDQUFDd0IsT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDaUssa0JBQWtCLENBQVk7UUFDdER0SyxNQUFNLEVBQUUsT0FBTztRQUNmQyxJQUFJLEVBQUcsSUFBQyxDQUFBdUssYUFBQSxHQUFFLElBQUksQ0FBQ25LLE9BQU8sY0FBQW1LLGFBQUEsdUJBQVpBLGFBQUEsQ0FBYzVMLEVBQUcsRUFBQztRQUM1QmEsSUFBSSxFQUFFLElBQUE4SyxVQUFBLENBQUF6TSxPQUFBLEVBQWU7VUFBRWU7UUFBTSxDQUFDLENBQUM7UUFDL0JxQixPQUFPLEVBQUU7VUFBRSxjQUFjLEVBQUU7UUFBa0MsQ0FBQztRQUM5REMsWUFBWSxFQUFFO01BQ2hCLENBQUMsQ0FBQztNQUNGLElBQUksQ0FBQ0MsSUFBSSxDQUFDLFNBQVMsQ0FBQztJQUN0QixDQUFDLENBQUMsT0FBT0UsR0FBRyxFQUFFO01BQ1osSUFBSSxDQUFDRixJQUFJLENBQUMsT0FBTyxFQUFFRSxHQUFHLENBQUM7TUFDdkIsTUFBTUEsR0FBRztJQUNYO0VBQ0Y7O0VBRUE7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtFQUNFLE1BQU1rRSxJQUFJQSxDQUNSQyxRQUFnQixHQUFHLElBQUEwRSxzQkFBQSxDQUFBckwsT0FBQSxNQUFJLEVBQUFxTSxlQUFBLEVBQWlCcEMsWUFBWSxFQUNwRHJELE9BQWUsR0FBRyxJQUFBeUUsc0JBQUEsQ0FBQXJMLE9BQUEsTUFBSSxFQUFBcU0sZUFBQSxFQUFpQm5DLFdBQVcsRUFDbkM7SUFDZixNQUFNdEosS0FBSyxHQUFHK0wsZUFBZSxDQUFDLElBQUksQ0FBQ3BLLE9BQU8sQ0FBQztJQUMzQyxNQUFNc0UsU0FBUyxHQUFHLElBQUErRixJQUFBLENBQUE1TSxPQUFBLEVBQVMsQ0FBQztJQUU1QixPQUFPNkcsU0FBUyxHQUFHRCxPQUFPLEdBQUcsSUFBQWdHLElBQUEsQ0FBQTVNLE9BQUEsRUFBUyxDQUFDLEVBQUU7TUFDdkMsSUFBSTtRQUNGLE1BQU1nQyxHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUNWLEtBQUssQ0FBQyxDQUFDO1FBQzlCLFFBQVFVLEdBQUcsQ0FBQ2pCLEtBQUs7VUFDZixLQUFLLE1BQU07WUFDVCxNQUFNLElBQUlTLEtBQUssQ0FBQywwQkFBMEIsQ0FBQztVQUM3QyxLQUFLLFNBQVM7WUFDWixNQUFNLElBQUlBLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQztVQUN6QyxLQUFLLGdCQUFnQjtVQUNyQixLQUFLLFlBQVk7WUFDZixNQUFNcUwsS0FBSyxDQUFDbEcsUUFBUSxDQUFDO1lBQ3JCO1VBQ0YsS0FBSyxRQUFRO1lBQ1g7WUFDQTtZQUNBLElBQUksQ0FBQ3JFLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSWQsS0FBSyxDQUFDLCtCQUErQixDQUFDLENBQUM7WUFDL0Q7VUFDRixLQUFLLGFBQWE7WUFDaEIsSUFBSSxDQUFDYyxJQUFJLENBQUMsYUFBYSxDQUFDO1lBQ3hCO1FBQ0o7TUFDRixDQUFDLENBQUMsT0FBT0UsR0FBRyxFQUFFO1FBQ1osSUFBSSxDQUFDRixJQUFJLENBQUMsT0FBTyxFQUFFRSxHQUFHLENBQUM7UUFDdkIsTUFBTUEsR0FBRztNQUNYO0lBQ0Y7SUFFQSxNQUFNc0ssWUFBWSxHQUFHLElBQUk5SSxzQkFBc0IsQ0FDNUMsMkJBQTBCNEMsT0FBUSxnQkFBZWhHLEtBQU0sRUFBQyxFQUN6REEsS0FDRixDQUFDO0lBQ0QsSUFBSSxDQUFDMEIsSUFBSSxDQUFDLE9BQU8sRUFBRXdLLFlBQVksQ0FBQztJQUNoQyxNQUFNQSxZQUFZO0VBQ3BCOztFQUVBO0FBQ0Y7QUFDQTtFQUNFLE1BQU14TCxLQUFLQSxDQUFBLEVBQXVCO0lBQ2hDLElBQUk7TUFDRixNQUFNaUIsT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDaUssa0JBQWtCLENBQVk7UUFDdkR0SyxNQUFNLEVBQUUsS0FBSztRQUNiQyxJQUFJLEVBQUcsSUFBR3dLLGVBQWUsQ0FBQyxJQUFJLENBQUNwSyxPQUFPLENBQUUsRUFBQztRQUN6Q0YsWUFBWSxFQUFFO01BQ2hCLENBQUMsQ0FBQztNQUNGLElBQUksQ0FBQ0UsT0FBTyxHQUFHQSxPQUFPO01BQ3RCLE9BQU9BLE9BQU87SUFDaEIsQ0FBQyxDQUFDLE9BQU9DLEdBQUcsRUFBRTtNQUNaLElBQUksQ0FBQ0YsSUFBSSxDQUFDLE9BQU8sRUFBRUUsR0FBRyxDQUFDO01BQ3ZCLE1BQU1BLEdBQUc7SUFDWDtFQUNGO0VBRVE2RixPQUFPQSxDQUNiQSxPQUE2QixFQUM3QjFILE9BQWUsR0FBRyxDQUFDLENBQUMsRUFDRjtJQUNsQjtJQUNBLElBQUkwSSxRQUFxQixHQUN2QixPQUFPaEIsT0FBTyxLQUFLLFFBQVEsR0FBRztNQUFFbkcsTUFBTSxFQUFFLEtBQUs7TUFBRXlILEdBQUcsRUFBRXRCO0lBQVEsQ0FBQyxHQUFHQSxPQUFPO0lBRXpFLE1BQU0wRSxPQUFPLEdBQUcsSUFBSTVFLGdCQUFPLEtBQUFrRCxzQkFBQSxDQUFBckwsT0FBQSxFQUFDLElBQUksRUFBQWtNLFlBQUEsR0FBY3ZMLE9BQU8sQ0FBQztJQUN0RG9NLE9BQU8sQ0FBQzlMLEVBQUUsQ0FBQyxVQUFVLEVBQUd5SCxRQUFzQixJQUFLO01BQ2pELElBQUksQ0FBQ3NFLE9BQU8sR0FBR3RFLFFBQVEsQ0FBQ3RHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQztJQUNuRCxDQUFDLENBQUM7SUFDRixPQUFPMkssT0FBTyxDQUFDMUUsT0FBTyxDQUFJZ0IsUUFBUSxDQUFDO0VBQ3JDO0VBRVE0RCxhQUFhQSxDQUFBLEVBQVc7SUFDOUIsTUFBTXRELEdBQUcsR0FBSSxHQUFFLElBQUEwQixzQkFBQSxDQUFBckwsT0FBQSxNQUFJLEVBQUFrTSxZQUFBLEVBQWExQyxXQUFZLG1CQUFrQixJQUFBNkIsc0JBQUEsQ0FBQXJMLE9BQUEsTUFBSSxFQUFBa00sWUFBQSxFQUFhekMsT0FDNUUsR0FBRSxJQUFBNEIsc0JBQUEsQ0FBQXJMLE9BQUEsTUFBSSxFQUFBc00sUUFBQSxJQUFZLFVBQVUsR0FBRyxFQUFHLGVBQWNLLGVBQWUsQ0FBQyxJQUFJLENBQUNwSyxPQUFPLENBQUUsVUFBUztJQUUxRixPQUFPLElBQUksQ0FBQ3lLLE9BQU8sR0FBSSxHQUFFckQsR0FBSSxZQUFXLElBQUksQ0FBQ3FELE9BQVEsRUFBQyxHQUFHckQsR0FBRztFQUM5RDs7RUFFQTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0VBQ0UsTUFBTXNDLFVBQVVBLENBQUEsRUFBc0I7SUFDcEMsSUFBSSxJQUFJLENBQUNpQixRQUFRLFFBQUE3QixzQkFBQSxDQUFBckwsT0FBQSxFQUFJLElBQUksRUFBQXVNLGFBQUEsQ0FBYyxFQUFFO01BQ3ZDLFdBQUFsQixzQkFBQSxDQUFBckwsT0FBQSxFQUFPLElBQUksRUFBQXVNLGFBQUE7SUFDYjtJQUVBLElBQUFwQixzQkFBQSxDQUFBbkwsT0FBQSxNQUFJLEVBQUF1TSxhQUFBLEVBQWlCLEVBQUU7SUFFdkIsT0FBTyxJQUFJLENBQUNTLE9BQU8sS0FBSyxNQUFNLEVBQUU7TUFBQSxJQUFBRyxTQUFBO01BQzlCLE1BQU1DLFdBQVcsR0FBRyxNQUFNLElBQUksQ0FBQy9FLE9BQU8sQ0FBVztRQUMvQ25HLE1BQU0sRUFBRSxLQUFLO1FBQ2J5SCxHQUFHLEVBQUUsSUFBSSxDQUFDc0QsYUFBYSxDQUFDLENBQUM7UUFDekI3SyxPQUFPLEVBQUU7VUFDUGlMLE1BQU0sRUFBRTtRQUNWO01BQ0YsQ0FBQyxDQUFDO01BRUYsSUFBQWxDLHNCQUFBLENBQUFuTCxPQUFBLE1BQUksRUFBQXVNLGFBQUEsRUFBaUIsSUFBQWUsT0FBQSxDQUFBdE4sT0FBQSxFQUFBbU4sU0FBQSxPQUFBOUIsc0JBQUEsQ0FBQXJMLE9BQUEsTUFBSSxFQUFBdU0sYUFBQSxHQUFBeE4sSUFBQSxDQUFBb08sU0FBQSxFQUFzQkMsV0FBVyxDQUFDO0lBQzdEO0lBQ0EsSUFBSSxDQUFDRixRQUFRLEdBQUcsSUFBSTtJQUVwQixXQUFBN0Isc0JBQUEsQ0FBQXJMLE9BQUEsRUFBTyxJQUFJLEVBQUF1TSxhQUFBO0VBQ2I7O0VBRUE7QUFDRjtBQUNBO0VBQ0UsTUFBTWIsTUFBTUEsQ0FBQSxFQUFrQjtJQUM1QixPQUFPLElBQUksQ0FBQ2Msa0JBQWtCLENBQU87TUFDbkN0SyxNQUFNLEVBQUUsUUFBUTtNQUNoQkMsSUFBSSxFQUFHLElBQUd3SyxlQUFlLENBQUMsSUFBSSxDQUFDcEssT0FBTyxDQUFFO0lBQzFDLENBQUMsQ0FBQztFQUNKO0VBRVFpSyxrQkFBa0JBLENBQUluRSxPQUFvQixFQUFFO0lBQ2xELE1BQU07TUFBRWxHLElBQUk7TUFBRUU7SUFBYSxDQUFDLEdBQUdnRyxPQUFPO0lBQ3RDLE1BQU1rQixPQUFPLEdBQUcsQ0FDZCxJQUFBOEIsc0JBQUEsQ0FBQXJMLE9BQUEsTUFBSSxFQUFBa00sWUFBQSxFQUFhMUMsV0FBVyxFQUM1QixlQUFlLEVBQ2QsSUFBRyxJQUFBNkIsc0JBQUEsQ0FBQXJMLE9BQUEsTUFBSSxFQUFBa00sWUFBQSxFQUFhekMsT0FBUSxFQUFDLEVBQzlCLElBQUksSUFBQTRCLHNCQUFBLENBQUFyTCxPQUFBLE1BQUksRUFBQXNNLFFBQUEsSUFBWSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUNyQyxZQUFZLENBQ2IsQ0FBQzVDLElBQUksQ0FBQyxHQUFHLENBQUM7SUFFWCxPQUFPLElBQUlSLFNBQVMsS0FBQW1DLHNCQUFBLENBQUFyTCxPQUFBLEVBQUMsSUFBSSxFQUFBa00sWUFBQSxHQUFjO01BQUU3SjtJQUFhLENBQUMsQ0FBQyxDQUFDZ0csT0FBTyxDQUFBaEosYUFBQSxDQUFBQSxhQUFBLEtBQzNEZ0osT0FBTztNQUNWc0IsR0FBRyxFQUFFSixPQUFPLEdBQUdwSDtJQUFJLEVBQ3BCLENBQUM7RUFDSjtBQUNGOztBQUVBO0FBQ0E7QUFDQTtBQUZBeUIsT0FBQSxDQUFBa0ksVUFBQSxHQUFBQSxVQUFBO0FBQUEsSUFBQXlCLFlBQUEsT0FBQTFDLFFBQUEsQ0FBQTdLLE9BQUE7QUFBQSxJQUFBd04sZ0JBQUEsT0FBQTNDLFFBQUEsQ0FBQTdLLE9BQUE7QUFBQSxJQUFBeU4sUUFBQSxPQUFBNUMsUUFBQSxDQUFBN0ssT0FBQTtBQUFBLElBQUEwTix5QkFBQSxPQUFBN0MsUUFBQSxDQUFBN0ssT0FBQTtBQUFBLElBQUEyTixxQkFBQSxPQUFBOUMsUUFBQSxDQUFBN0ssT0FBQTtBQUFBLElBQUE0TiwwQkFBQSxPQUFBL0MsUUFBQSxDQUFBN0ssT0FBQTtBQUFBLElBQUE2TixPQUFBLE9BQUFoRCxRQUFBLENBQUE3SyxPQUFBO0FBR08sTUFBTW9MLFdBQVcsU0FHZDlLLG9CQUFZLENBQUM7RUFVckI7QUFDRjtBQUNBO0VBQ0VDLFdBQVdBLENBQUNJLE9BQW9DLEVBQUU7SUFDaEQsS0FBSyxDQUFDLENBQUM7SUFBQzRNLFlBQUEsQ0FBQXZDLEdBQUE7TUFBQUMsUUFBQTtNQUFBQyxLQUFBO0lBQUE7SUFBQXNDLGdCQUFBLENBQUF4QyxHQUFBO01BQUFDLFFBQUE7TUFBQUMsS0FBQTtJQUFBO0lBQUF1QyxRQUFBLENBQUF6QyxHQUFBO01BQUFDLFFBQUE7TUFBQUMsS0FBQTtJQUFBO0lBQUF3Qyx5QkFBQSxDQUFBMUMsR0FBQTtNQUFBQyxRQUFBO01BQUFDLEtBQUE7SUFBQTtJQUFBeUMscUJBQUEsQ0FBQTNDLEdBQUE7TUFBQUMsUUFBQTtNQUFBQyxLQUFBO0lBQUE7SUFBQTBDLDBCQUFBLENBQUE1QyxHQUFBO01BQUFDLFFBQUE7TUFBQUMsS0FBQTtJQUFBO0lBQUEyQyxPQUFBLENBQUE3QyxHQUFBO01BQUFDLFFBQUE7TUFBQUMsS0FBQTtJQUFBO0lBQUEsSUFBQW5MLGdCQUFBLENBQUFDLE9BQUE7SUFFUixJQUFBbUwsc0JBQUEsQ0FBQW5MLE9BQUEsTUFBSSxFQUFBdU4sWUFBQSxFQUFlNU0sT0FBTyxDQUFDb0ssVUFBVTtJQUNyQyxJQUFBSSxzQkFBQSxDQUFBbkwsT0FBQSxNQUFJLEVBQUF3TixnQkFBQSxFQUFtQjdNLE9BQU8sQ0FBQzJLLGNBQWM7SUFDN0MsSUFBSSxDQUFDL0ksT0FBTyxHQUFHNUIsT0FBTyxDQUFDNEIsT0FBTztJQUM5QixJQUFBNEksc0JBQUEsQ0FBQW5MLE9BQUEsTUFBSSxFQUFBeU4sUUFBQSxFQUFZLElBQUlLLFNBQVMsQ0FBUztNQUNwQ0MsYUFBYSxFQUFHMUYsT0FBTyxJQUFLLElBQUksQ0FBQzJGLG1CQUFtQixDQUFDM0YsT0FBTyxDQUFDO01BQzdEbkUsR0FBRyxFQUFFO0lBQ1AsQ0FBQyxDQUFDO0lBQ0Y7SUFDQSxJQUFJLENBQUNqRCxFQUFFLENBQUMsT0FBTyxFQUFHQyxLQUFLLFFBQUFpSyxzQkFBQSxDQUFBbkwsT0FBQSxFQUFNLElBQUksRUFBQTZOLE9BQUEsRUFBVTNNLEtBQUssQ0FBQyxDQUFDO0VBQ3BEO0VBRUEsSUFBSUosRUFBRUEsQ0FBQSxFQUFHO0lBQ1AsT0FBTyxJQUFJLENBQUN5QixPQUFPLENBQUN6QixFQUFFO0VBQ3hCOztFQUVBO0FBQ0Y7QUFDQTtFQUNFLE1BQU1TLElBQUlBLENBQUEsRUFBa0I7SUFDMUIsSUFBSTtNQUFBLElBQUEwTSxjQUFBLEVBQUFDLGNBQUEsRUFBQUMsY0FBQSxFQUFBQyxjQUFBLEVBQUFDLGNBQUE7TUFDRixJQUFJLENBQUM5TCxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUN5TCxtQkFBbUIsQ0FBWTtRQUN2RDlMLE1BQU0sRUFBRSxNQUFNO1FBQ2RDLElBQUksRUFBRSxFQUFFO1FBQ1JSLElBQUksRUFBRSxJQUFBOEssVUFBQSxDQUFBek0sT0FBQSxFQUFlO1VBQ25CK0IsZ0JBQWdCLEdBQUFrTSxjQUFBLEdBQUUsSUFBSSxDQUFDMUwsT0FBTyxjQUFBMEwsY0FBQSx1QkFBWkEsY0FBQSxDQUFjbE0sZ0JBQWdCO1VBQ2hEdU0sbUJBQW1CLEdBQUFKLGNBQUEsR0FBRSxJQUFJLENBQUMzTCxPQUFPLGNBQUEyTCxjQUFBLHVCQUFaQSxjQUFBLENBQWNJLG1CQUFtQjtVQUN0RDlQLE1BQU0sR0FBQTJQLGNBQUEsR0FBRSxJQUFJLENBQUM1TCxPQUFPLGNBQUE0TCxjQUFBLHVCQUFaQSxjQUFBLENBQWMzUCxNQUFNO1VBQzVCa0MsU0FBUyxHQUFBME4sY0FBQSxHQUFFLElBQUksQ0FBQzdMLE9BQU8sY0FBQTZMLGNBQUEsdUJBQVpBLGNBQUEsQ0FBYzFOLFNBQVM7VUFDbEM2TixVQUFVLEdBQUFGLGNBQUEsR0FBRSxJQUFJLENBQUM5TCxPQUFPLGNBQUE4TCxjQUFBLHVCQUFaQSxjQUFBLENBQWNFO1FBQzVCLENBQUMsQ0FBQztRQUNGbk0sT0FBTyxFQUFFO1VBQ1AsY0FBYyxFQUFFO1FBQ2xCLENBQUM7UUFDREMsWUFBWSxFQUFFO01BQ2hCLENBQUMsQ0FBQztNQUNGLElBQUksQ0FBQ0MsSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNuQixDQUFDLENBQUMsT0FBT0UsR0FBRyxFQUFFO01BQ1osSUFBSSxDQUFDRixJQUFJLENBQUMsT0FBTyxFQUFFRSxHQUFHLENBQUM7TUFDdkIsTUFBTUEsR0FBRztJQUNYO0VBQ0Y7O0VBRUE7QUFDRjtBQUNBO0FBQ0E7RUFDRSxNQUFNZ0osVUFBVUEsQ0FBQ3ZGLEtBQW1DLEVBQWlCO0lBQ25FLE1BQU0sSUFBQW9GLHNCQUFBLENBQUFyTCxPQUFBLE1BQUksRUFBQXlOLFFBQUEsRUFBVXJKLE9BQU8sQ0FBQzZCLEtBQUssQ0FBQztFQUNwQztFQUVBLE1BQU13RixhQUFhQSxDQUFBLEVBQW1DO0lBQ3BELE1BQU0sQ0FDSitDLGlCQUFpQixFQUNqQkMsYUFBYSxFQUNiQyxrQkFBa0IsQ0FDbkIsR0FBRyxNQUFNekwsUUFBQSxDQUFBakQsT0FBQSxDQUFRMk8sR0FBRyxDQUFDLENBQ3BCLElBQUksQ0FBQ0Msb0JBQW9CLENBQUMsQ0FBQyxFQUMzQixJQUFJLENBQUNDLGdCQUFnQixDQUFDLENBQUMsRUFDdkIsSUFBSSxDQUFDQyxxQkFBcUIsQ0FBQyxDQUFDLENBQzdCLENBQUM7SUFDRixPQUFPO01BQUVOLGlCQUFpQjtNQUFFQyxhQUFhO01BQUVDO0lBQW1CLENBQUM7RUFDakU7O0VBRUE7QUFDRjtBQUNBO0VBQ0UsTUFBTWxMLEtBQUtBLENBQUEsRUFBa0I7SUFDM0IsSUFBSTtNQUNGLE1BQU16QyxLQUFpQixHQUFHLGdCQUFnQjtNQUMxQyxJQUFJLENBQUN3QixPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUN5TCxtQkFBbUIsQ0FBWTtRQUN2RDlMLE1BQU0sRUFBRSxPQUFPO1FBQ2ZDLElBQUksRUFBRyxJQUFHLElBQUksQ0FBQ0ksT0FBTyxDQUFDekIsRUFBRyxFQUFDO1FBQzNCYSxJQUFJLEVBQUUsSUFBQThLLFVBQUEsQ0FBQXpNLE9BQUEsRUFBZTtVQUFFZTtRQUFNLENBQUMsQ0FBQztRQUMvQnFCLE9BQU8sRUFBRTtVQUFFLGNBQWMsRUFBRTtRQUFrQyxDQUFDO1FBQzlEQyxZQUFZLEVBQUU7TUFDaEIsQ0FBQyxDQUFDO01BQ0YsSUFBSSxDQUFDQyxJQUFJLENBQUMsZ0JBQWdCLENBQUM7SUFDN0IsQ0FBQyxDQUFDLE9BQU9FLEdBQUcsRUFBRTtNQUNaLElBQUksQ0FBQ0YsSUFBSSxDQUFDLE9BQU8sRUFBRUUsR0FBRyxDQUFDO01BQ3ZCLE1BQU1BLEdBQUc7SUFDWDtFQUNGOztFQUVBO0FBQ0Y7QUFDQTtFQUNFLE1BQU1rQixLQUFLQSxDQUFBLEVBQWtCO0lBQzNCLElBQUk7TUFDRixNQUFNM0MsS0FBaUIsR0FBRyxTQUFTO01BQ25DLElBQUksQ0FBQ3dCLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQ3lMLG1CQUFtQixDQUFZO1FBQ3ZEOUwsTUFBTSxFQUFFLE9BQU87UUFDZkMsSUFBSSxFQUFHLElBQUcsSUFBSSxDQUFDSSxPQUFPLENBQUN6QixFQUFHLEVBQUM7UUFDM0JhLElBQUksRUFBRSxJQUFBOEssVUFBQSxDQUFBek0sT0FBQSxFQUFlO1VBQUVlO1FBQU0sQ0FBQyxDQUFDO1FBQy9CcUIsT0FBTyxFQUFFO1VBQUUsY0FBYyxFQUFFO1FBQWtDLENBQUM7UUFDOURDLFlBQVksRUFBRTtNQUNoQixDQUFDLENBQUM7TUFDRixJQUFJLENBQUNDLElBQUksQ0FBQyxTQUFTLENBQUM7SUFDdEIsQ0FBQyxDQUFDLE9BQU9FLEdBQUcsRUFBRTtNQUNaLElBQUksQ0FBQ0YsSUFBSSxDQUFDLE9BQU8sRUFBRUUsR0FBRyxDQUFDO01BQ3ZCLE1BQU1BLEdBQUc7SUFDWDtFQUNGOztFQUVBO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7RUFDRSxNQUFNa0UsSUFBSUEsQ0FDUkMsUUFBZ0IsR0FBRyxJQUFBMEUsc0JBQUEsQ0FBQXJMLE9BQUEsTUFBSSxFQUFBd04sZ0JBQUEsRUFBaUJ2RCxZQUFZLEVBQ3BEckQsT0FBZSxHQUFHLElBQUF5RSxzQkFBQSxDQUFBckwsT0FBQSxNQUFJLEVBQUF3TixnQkFBQSxFQUFpQnRELFdBQVcsRUFDbkM7SUFDZixNQUFNdEosS0FBSyxHQUFHK0wsZUFBZSxDQUFDLElBQUksQ0FBQ3BLLE9BQU8sQ0FBQztJQUMzQyxNQUFNc0UsU0FBUyxHQUFHLElBQUErRixJQUFBLENBQUE1TSxPQUFBLEVBQVMsQ0FBQztJQUU1QixPQUFPNkcsU0FBUyxHQUFHRCxPQUFPLEdBQUcsSUFBQWdHLElBQUEsQ0FBQTVNLE9BQUEsRUFBUyxDQUFDLEVBQUU7TUFDdkMsSUFBSTtRQUNGLE1BQU1nQyxHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUNWLEtBQUssQ0FBQyxDQUFDO1FBQzlCLFFBQVFVLEdBQUcsQ0FBQ2pCLEtBQUs7VUFDZixLQUFLLE1BQU07WUFDVCxNQUFNLElBQUlTLEtBQUssQ0FBQywwQkFBMEIsQ0FBQztVQUM3QyxLQUFLLFNBQVM7WUFDWixNQUFNLElBQUlBLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQztVQUN6QyxLQUFLLGdCQUFnQjtVQUNyQixLQUFLLFlBQVk7WUFDZixNQUFNcUwsS0FBSyxDQUFDbEcsUUFBUSxDQUFDO1lBQ3JCO1VBQ0YsS0FBSyxRQUFRO1lBQ1gsSUFBSSxDQUFDckUsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJZCxLQUFLLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztZQUNoRTtVQUNGLEtBQUssYUFBYTtZQUNoQixJQUFJLENBQUNjLElBQUksQ0FBQyxhQUFhLENBQUM7WUFDeEI7UUFDSjtNQUNGLENBQUMsQ0FBQyxPQUFPRSxHQUFHLEVBQUU7UUFDWixJQUFJLENBQUNGLElBQUksQ0FBQyxPQUFPLEVBQUVFLEdBQUcsQ0FBQztRQUN2QixNQUFNQSxHQUFHO01BQ1g7SUFDRjtJQUVBLE1BQU1zSyxZQUFZLEdBQUcsSUFBSTlJLHNCQUFzQixDQUM1QywyQkFBMEI0QyxPQUFRLGdCQUFlaEcsS0FBTSxFQUFDLEVBQ3pEQSxLQUNGLENBQUM7SUFDRCxJQUFJLENBQUMwQixJQUFJLENBQUMsT0FBTyxFQUFFd0ssWUFBWSxDQUFDO0lBQ2hDLE1BQU1BLFlBQVk7RUFDcEI7O0VBRUE7QUFDRjtBQUNBO0VBQ0UsTUFBTXhMLEtBQUtBLENBQUEsRUFBdUI7SUFDaEMsSUFBSTtNQUNGLE1BQU1pQixPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUN5TCxtQkFBbUIsQ0FBWTtRQUN4RDlMLE1BQU0sRUFBRSxLQUFLO1FBQ2JDLElBQUksRUFBRyxJQUFHd0ssZUFBZSxDQUFDLElBQUksQ0FBQ3BLLE9BQU8sQ0FBRSxFQUFDO1FBQ3pDRixZQUFZLEVBQUU7TUFDaEIsQ0FBQyxDQUFDO01BQ0YsSUFBSSxDQUFDRSxPQUFPLEdBQUdBLE9BQU87TUFDdEIsT0FBT0EsT0FBTztJQUNoQixDQUFDLENBQUMsT0FBT0MsR0FBRyxFQUFFO01BQ1osSUFBSSxDQUFDRixJQUFJLENBQUMsT0FBTyxFQUFFRSxHQUFHLENBQUM7TUFDdkIsTUFBTUEsR0FBRztJQUNYO0VBQ0Y7RUFFQSxNQUFNb00sb0JBQW9CQSxDQUFBLEVBQTZDO0lBQ3JFLFFBQUF2RCxzQkFBQSxDQUFBckwsT0FBQSxFQUFJLElBQUksRUFBQTBOLHlCQUFBLEdBQTRCO01BQ2xDLFdBQUFyQyxzQkFBQSxDQUFBckwsT0FBQSxFQUFPLElBQUksRUFBQTBOLHlCQUFBO0lBQ2I7SUFFQSxNQUFNbkcsT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDeUcsbUJBQW1CLENBRTVDO01BQ0E5TCxNQUFNLEVBQUUsS0FBSztNQUNiQyxJQUFJLEVBQUcsSUFBR3dLLGVBQWUsQ0FBQyxJQUFJLENBQUNwSyxPQUFPLENBQUUsb0JBQW1CO01BQzNERixZQUFZLEVBQUU7SUFDaEIsQ0FBQyxDQUFDO0lBRUYsSUFBQThJLHNCQUFBLENBQUFuTCxPQUFBLE1BQUksRUFBQTBOLHlCQUFBLEVBQTZCbkcsT0FBTyxhQUFQQSxPQUFPLGNBQVBBLE9BQU8sR0FBSSxFQUFFO0lBRTlDLFdBQUE4RCxzQkFBQSxDQUFBckwsT0FBQSxFQUFPLElBQUksRUFBQTBOLHlCQUFBO0VBQ2I7RUFFQSxNQUFNbUIsZ0JBQWdCQSxDQUFBLEVBQXlDO0lBQzdELFFBQUF4RCxzQkFBQSxDQUFBckwsT0FBQSxFQUFJLElBQUksRUFBQTJOLHFCQUFBLEdBQXdCO01BQzlCLFdBQUF0QyxzQkFBQSxDQUFBckwsT0FBQSxFQUFPLElBQUksRUFBQTJOLHFCQUFBO0lBQ2I7SUFFQSxNQUFNcEcsT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDeUcsbUJBQW1CLENBRTVDO01BQ0E5TCxNQUFNLEVBQUUsS0FBSztNQUNiQyxJQUFJLEVBQUcsSUFBR3dLLGVBQWUsQ0FBQyxJQUFJLENBQUNwSyxPQUFPLENBQUUsZ0JBQWU7TUFDdkRGLFlBQVksRUFBRTtJQUNoQixDQUFDLENBQUM7SUFFRixJQUFBOEksc0JBQUEsQ0FBQW5MLE9BQUEsTUFBSSxFQUFBMk4scUJBQUEsRUFBeUJwRyxPQUFPLGFBQVBBLE9BQU8sY0FBUEEsT0FBTyxHQUFJLEVBQUU7SUFFMUMsV0FBQThELHNCQUFBLENBQUFyTCxPQUFBLEVBQU8sSUFBSSxFQUFBMk4scUJBQUE7RUFDYjtFQUVBLE1BQU1tQixxQkFBcUJBLENBQUEsRUFBOEM7SUFDdkUsUUFBQXpELHNCQUFBLENBQUFyTCxPQUFBLEVBQUksSUFBSSxFQUFBNE4sMEJBQUEsR0FBNkI7TUFDbkMsV0FBQXZDLHNCQUFBLENBQUFyTCxPQUFBLEVBQU8sSUFBSSxFQUFBNE4sMEJBQUE7SUFDYjtJQUVBLE1BQU1yRyxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUN5RyxtQkFBbUIsQ0FFNUM7TUFDQTlMLE1BQU0sRUFBRSxLQUFLO01BQ2JDLElBQUksRUFBRyxJQUFHd0ssZUFBZSxDQUFDLElBQUksQ0FBQ3BLLE9BQU8sQ0FBRSxxQkFBb0I7TUFDNURGLFlBQVksRUFBRTtJQUNoQixDQUFDLENBQUM7SUFFRixJQUFBOEksc0JBQUEsQ0FBQW5MLE9BQUEsTUFBSSxFQUFBNE4sMEJBQUEsRUFBOEJyRyxPQUFPLGFBQVBBLE9BQU8sY0FBUEEsT0FBTyxHQUFJLEVBQUU7SUFFL0MsV0FBQThELHNCQUFBLENBQUFyTCxPQUFBLEVBQU8sSUFBSSxFQUFBNE4sMEJBQUE7RUFDYjs7RUFFQTtBQUNGO0FBQ0E7RUFDRSxNQUFNbEMsTUFBTUEsQ0FBQSxFQUFrQjtJQUM1QixPQUFPLElBQUksQ0FBQ3NDLG1CQUFtQixDQUFPO01BQ3BDOUwsTUFBTSxFQUFFLFFBQVE7TUFDaEJDLElBQUksRUFBRyxJQUFHd0ssZUFBZSxDQUFDLElBQUksQ0FBQ3BLLE9BQU8sQ0FBRTtJQUMxQyxDQUFDLENBQUM7RUFDSjtFQUVReUwsbUJBQW1CQSxDQUFJM0YsT0FBb0IsRUFBRTtJQUNuRCxNQUFNO01BQUVsRyxJQUFJO01BQUVFO0lBQWEsQ0FBQyxHQUFHZ0csT0FBTztJQUN0QyxNQUFNa0IsT0FBTyxHQUFHLENBQ2QsSUFBQThCLHNCQUFBLENBQUFyTCxPQUFBLE1BQUksRUFBQXVOLFlBQUEsRUFBYS9ELFdBQVcsRUFDNUIsZUFBZSxFQUNkLElBQUcsSUFBQTZCLHNCQUFBLENBQUFyTCxPQUFBLE1BQUksRUFBQXVOLFlBQUEsRUFBYTlELE9BQVEsRUFBQyxFQUM5QixhQUFhLENBQ2QsQ0FBQ0MsSUFBSSxDQUFDLEdBQUcsQ0FBQztJQUVYLE9BQU8sSUFBSVIsU0FBUyxLQUFBbUMsc0JBQUEsQ0FBQXJMLE9BQUEsRUFBQyxJQUFJLEVBQUF1TixZQUFBLEdBQWM7TUFBRWxMO0lBQWEsQ0FBQyxDQUFDLENBQUNnRyxPQUFPLENBQUFoSixhQUFBLENBQUFBLGFBQUEsS0FDM0RnSixPQUFPO01BQ1ZzQixHQUFHLEVBQUVKLE9BQU8sR0FBR3BIO0lBQUksRUFDcEIsQ0FBQztFQUNKO0FBQ0Y7QUFBQ3lCLE9BQUEsQ0FBQXdILFdBQUEsR0FBQUEsV0FBQTtBQUFBLElBQUEyRCxJQUFBLE9BQUFsRSxRQUFBLENBQUE3SyxPQUFBO0FBQUEsSUFBQXdFLGFBQUEsT0FBQXFHLFFBQUEsQ0FBQTdLLE9BQUE7QUFBQSxJQUFBNkUsZUFBQSxPQUFBZ0csUUFBQSxDQUFBN0ssT0FBQTtBQUFBLElBQUFvRixXQUFBLE9BQUF5RixRQUFBLENBQUE3SyxPQUFBO0FBQUEsSUFBQWtHLE9BQUEsT0FBQTJFLFFBQUEsQ0FBQTdLLE9BQUE7QUFFRCxNQUFNOE4sU0FBUyxTQUdMN0osZ0JBQVEsQ0FBQztFQU9qQjtBQUNGO0FBQ0E7RUFDRTFELFdBQVdBLENBQUNJLE9BQXVDLEVBQUU7SUFDbkQsS0FBSyxDQUFDO01BQUV3RCxVQUFVLEVBQUU7SUFBSyxDQUFDLENBQUM7SUFBQzRLLElBQUEsQ0FBQS9ELEdBQUE7TUFBQUMsUUFBQTtNQUFBQyxLQUFBO0lBQUE7SUFBQTFHLGFBQUEsQ0FBQXdHLEdBQUE7TUFBQUMsUUFBQTtNQUFBQyxLQUFBO0lBQUE7SUFBQXJHLGVBQUEsQ0FBQW1HLEdBQUE7TUFBQUMsUUFBQTtNQUFBQyxLQUFBO0lBQUE7SUFBQTlGLFdBQUEsQ0FBQTRGLEdBQUE7TUFBQUMsUUFBQTtNQUFBQyxLQUFBO0lBQUE7SUFBQWhGLE9BQUEsQ0FBQThFLEdBQUE7TUFBQUMsUUFBQTtNQUFBQyxLQUFBO0lBQUE7SUFFNUIsTUFBTTZDLGFBQWEsR0FBR3BOLE9BQU8sQ0FBQ29OLGFBQWE7SUFFM0MsSUFBQTVDLHNCQUFBLENBQUFuTCxPQUFBLE1BQUksRUFBQStPLElBQUEsRUFBUXBPLE9BQU8sQ0FBQ3VELEdBQUc7SUFDdkIsSUFBQWlILHNCQUFBLENBQUFuTCxPQUFBLE1BQUksRUFBQXdFLGFBQUEsRUFBaUIsSUFBSUMsMEJBQVksQ0FBQyxDQUFDO0lBQ3ZDLElBQUEwRyxzQkFBQSxDQUFBbkwsT0FBQSxNQUFJLEVBQUE2RSxlQUFBLEVBQW1CLElBQUlDLHNCQUFRLENBQUMsQ0FBQztJQUVyQyxNQUFNVCxnQkFBZ0IsR0FBRztNQUFFQyxTQUFTLEVBQUU7SUFBTyxDQUFDO0lBQzlDLE1BQU1JLGdCQUFnQixHQUFHLElBQUEyRyxzQkFBQSxDQUFBckwsT0FBQSxNQUFJLEVBQUF3RSxhQUFBLEVBQWVHLE1BQU0sQ0FBQyxLQUFLLEVBQUVOLGdCQUFnQixDQUFDO0lBQzNFLE1BQU1VLGtCQUFrQixHQUFHLElBQUFzRyxzQkFBQSxDQUFBckwsT0FBQSxNQUFJLEVBQUE2RSxlQUFBLEVBQWlCRixNQUFNLENBQ3BELEtBQUssRUFDTE4sZ0JBQ0YsQ0FBQztJQUVELElBQUE4RyxzQkFBQSxDQUFBbkwsT0FBQSxNQUFJLEVBQUFvRixXQUFBLEVBQWUsSUFBQUMsOEJBQXFCLEVBQ3RDWCxnQkFBZ0IsRUFDaEJLLGtCQUNGLENBQUM7SUFFRCxJQUFJLENBQUM5RCxFQUFFLENBQUMsUUFBUSxFQUFFLE1BQU0sSUFBQW9LLHNCQUFBLENBQUFyTCxPQUFBLE1BQUksRUFBQXdFLGFBQUEsRUFBZVEsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUVqRE4sZ0JBQWdCLENBQUNPLElBQUksQ0FBQyxVQUFVLEVBQUUsTUFBTTtNQUN0QyxJQUFJO1FBQUEsSUFBQStKLHNCQUFBO1FBQ0Y7UUFDQSxNQUFNMUosR0FBRyxHQUFHeUksYUFBYSxDQUFDO1VBQ3hCN0wsTUFBTSxFQUFFLEtBQUs7VUFDYkMsSUFBSSxFQUFHLElBQUMsQ0FBQTZNLHNCQUFBLEdBQUUsSUFBQTNELHNCQUFBLENBQUFyTCxPQUFBLE1BQUksRUFBQStPLElBQUEsRUFBTXhNLE9BQU8sY0FBQXlNLHNCQUFBLHVCQUFqQkEsc0JBQUEsQ0FBbUJsTyxFQUFHLFVBQVM7VUFDekNzQixPQUFPLEVBQUU7WUFDUCxjQUFjLEVBQUU7VUFDbEIsQ0FBQztVQUNEQyxZQUFZLEVBQUU7UUFDaEIsQ0FBQyxDQUFDO1FBRUYsQ0FBQyxZQUFZO1VBQ1gsSUFBSTtZQUNGLE1BQU1MLEdBQUcsR0FBRyxNQUFNc0QsR0FBRztZQUNyQixJQUFJLENBQUNoRCxJQUFJLENBQUMsVUFBVSxFQUFFTixHQUFHLENBQUM7VUFDNUIsQ0FBQyxDQUFDLE9BQU9RLEdBQUcsRUFBRTtZQUNaLElBQUksQ0FBQ0YsSUFBSSxDQUFDLE9BQU8sRUFBRUUsR0FBRyxDQUFDO1VBQ3pCO1FBQ0YsQ0FBQyxFQUFFLENBQUM7UUFFSmtDLGdCQUFnQixDQUFDUSxJQUFJLENBQUNJLEdBQUcsQ0FBQ1gsTUFBTSxDQUFDLENBQUMsQ0FBQztNQUNyQyxDQUFDLENBQUMsT0FBT25DLEdBQUcsRUFBRTtRQUNaLElBQUksQ0FBQ0YsSUFBSSxDQUFDLE9BQU8sRUFBRUUsR0FBRyxDQUFDO01BQ3pCO0lBQ0YsQ0FBQyxDQUFDO0VBQ0o7RUFFQStDLE1BQU1BLENBQUNDLE9BQWUsRUFBRUMsR0FBVyxFQUFFQyxFQUFjLEVBQUU7SUFDbkQsTUFBTTtRQUFFQyxFQUFFO1FBQUVsRixJQUFJO1FBQUVtRjtNQUFvQixDQUFDLEdBQUdKLE9BQU87TUFBaEJLLElBQUksT0FBQUMseUJBQUEsQ0FBQTlGLE9BQUEsRUFBS3dGLE9BQU87SUFDakQsSUFBSU8sTUFBTTtJQUNWLFFBQVEsSUFBQXNGLHNCQUFBLENBQUFyTCxPQUFBLE1BQUksRUFBQStPLElBQUEsRUFBTXhNLE9BQU8sQ0FBQzdCLFNBQVM7TUFDakMsS0FBSyxRQUFRO1FBQ1hxRixNQUFNLEdBQUdGLElBQUk7UUFDYjtNQUNGLEtBQUssUUFBUTtNQUNiLEtBQUssWUFBWTtRQUNmRSxNQUFNLEdBQUc7VUFBRUo7UUFBRyxDQUFDO1FBQ2Y7TUFDRjtRQUNFSSxNQUFNLEdBQUExRyxhQUFBO1VBQUtzRztRQUFFLEdBQUtFLElBQUksQ0FBRTtJQUM1QjtJQUNBLElBQUF3RixzQkFBQSxDQUFBckwsT0FBQSxNQUFJLEVBQUF3RSxhQUFBLEVBQWV3QixLQUFLLENBQUNELE1BQU0sRUFBRU4sR0FBRyxFQUFFQyxFQUFFLENBQUM7RUFDM0M7O0VBRUE7QUFDRjtBQUNBO0VBQ0VmLE1BQU1BLENBQUEsRUFBRztJQUNQLFdBQUEwRyxzQkFBQSxDQUFBckwsT0FBQSxFQUFPLElBQUksRUFBQW9GLFdBQUE7RUFDYjs7RUFFQTtBQUNGO0FBQ0E7RUFDRWhCLE9BQU9BLENBQUM2QixLQUFvQyxFQUFFO0lBQzVDLFFBQUFvRixzQkFBQSxDQUFBckwsT0FBQSxFQUFJLElBQUksRUFBQWtHLE9BQUEsR0FBVTtNQUNoQixNQUFNLElBQUkxRSxLQUFLLENBQUMsMENBQTBDLENBQUM7SUFDN0Q7SUFFQSxJQUFBMkosc0JBQUEsQ0FBQW5MLE9BQUEsTUFBSSxFQUFBa0csT0FBQSxFQUFXLElBQUFqRCxRQUFBLENBQUFqRCxPQUFBLENBQWtCLENBQUNrRCxPQUFPLEVBQUVpRCxNQUFNLEtBQUs7TUFDcEQsSUFBSSxDQUFDbEIsSUFBSSxDQUFDLFVBQVUsRUFBRSxNQUFNL0IsT0FBTyxDQUFDLENBQUMsQ0FBQztNQUN0QyxJQUFJLENBQUMrQixJQUFJLENBQUMsT0FBTyxFQUFFa0IsTUFBTSxDQUFDO0lBQzVCLENBQUMsQ0FBQztJQUVGLElBQUksSUFBQUMsa0JBQVEsRUFBQ0gsS0FBSyxDQUFDLElBQUksTUFBTSxJQUFJQSxLQUFLLElBQUksSUFBQUksb0JBQVUsRUFBQ0osS0FBSyxDQUFDZixJQUFJLENBQUMsRUFBRTtNQUNoRTtNQUNBZSxLQUFLLENBQUNmLElBQUksS0FBQW1HLHNCQUFBLENBQUFyTCxPQUFBLEVBQUMsSUFBSSxFQUFBb0YsV0FBQSxDQUFZLENBQUM7SUFDOUIsQ0FBQyxNQUFNO01BQ0wsSUFBSSxJQUFBN0IsUUFBQSxDQUFBdkQsT0FBQSxFQUFjaUcsS0FBSyxDQUFDLEVBQUU7UUFDeEIsS0FBSyxNQUFNRixNQUFNLElBQUlFLEtBQUssRUFBRTtVQUMxQixLQUFLLE1BQU1uRyxHQUFHLElBQUksSUFBQXdHLEtBQUEsQ0FBQXRHLE9BQUEsRUFBWStGLE1BQU0sQ0FBQyxFQUFFO1lBQ3JDLElBQUksT0FBT0EsTUFBTSxDQUFDakcsR0FBRyxDQUFDLEtBQUssU0FBUyxFQUFFO2NBQ3BDaUcsTUFBTSxDQUFDakcsR0FBRyxDQUFDLEdBQUd5RyxNQUFNLENBQUNSLE1BQU0sQ0FBQ2pHLEdBQUcsQ0FBQyxDQUFDO1lBQ25DO1VBQ0Y7VUFDQSxJQUFJLENBQUNrRyxLQUFLLENBQUNELE1BQU0sQ0FBQztRQUNwQjtRQUNBLElBQUksQ0FBQ2YsR0FBRyxDQUFDLENBQUM7TUFDWixDQUFDLE1BQU0sSUFBSSxPQUFPaUIsS0FBSyxLQUFLLFFBQVEsRUFBRTtRQUNwQyxJQUFBb0Ysc0JBQUEsQ0FBQXJMLE9BQUEsTUFBSSxFQUFBb0YsV0FBQSxFQUFhWSxLQUFLLENBQUNDLEtBQUssRUFBRSxNQUFNLENBQUM7UUFDckMsSUFBQW9GLHNCQUFBLENBQUFyTCxPQUFBLE1BQUksRUFBQW9GLFdBQUEsRUFBYUosR0FBRyxDQUFDLENBQUM7TUFDeEI7SUFDRjtJQUVBLE9BQU8sSUFBSTtFQUNiOztFQUVBO0FBQ0Y7QUFDQTtBQUNBO0VBQ0U3QixJQUFJQSxDQUFDcUQsVUFBc0IsRUFBRUMsUUFBNEIsRUFBRTtJQUN6RCxJQUFJLElBQUE0RSxzQkFBQSxDQUFBckwsT0FBQSxNQUFJLEVBQUFrRyxPQUFBLE1BQWErSSxTQUFTLEVBQUU7TUFDOUIsSUFBSSxDQUFDN0ssT0FBTyxDQUFDLENBQUM7SUFDaEI7SUFDQSxPQUFPLElBQUFpSCxzQkFBQSxDQUFBckwsT0FBQSxNQUFJLEVBQUFrRyxPQUFBLEVBQVUvQyxJQUFJLENBQUNxRCxVQUFVLEVBQUVDLFFBQVEsQ0FBQztFQUNqRDtBQUNGO0FBRUEsU0FBU2tHLGVBQWVBLENBQUNwSyxPQUF1QyxFQUFVO0VBQ3hFLE1BQU0zQixLQUFLLEdBQUcyQixPQUFPLGFBQVBBLE9BQU8sdUJBQVBBLE9BQU8sQ0FBRXpCLEVBQUU7RUFDekIsSUFBSUYsS0FBSyxLQUFLcU8sU0FBUyxFQUFFO0lBQ3ZCLE1BQU0sSUFBSXpOLEtBQUssQ0FBQyx1REFBdUQsQ0FBQztFQUMxRTtFQUNBLE9BQU9aLEtBQUs7QUFDZDtBQUVBLFNBQVNpTSxLQUFLQSxDQUFDcUMsRUFBVSxFQUFpQjtFQUN4QyxPQUFPLElBQUFqTSxRQUFBLENBQUFqRCxPQUFBLENBQWFrRCxPQUFPLElBQUssSUFBQW1FLFlBQUEsQ0FBQXJILE9BQUEsRUFBV2tELE9BQU8sRUFBRWdNLEVBQUUsQ0FBQyxDQUFDO0FBQzFEOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBQUMsdUJBQWMsRUFBQyxNQUFNLEVBQUcvRixJQUFJLElBQUssSUFBSUQsSUFBSSxDQUFDQyxJQUFJLENBQUMsQ0FBQztBQUNoRCxJQUFBK0YsdUJBQWMsRUFBQyxPQUFPLEVBQUcvRixJQUFJLElBQUssSUFBSTBCLE1BQU0sQ0FBQzFCLElBQUksQ0FBQyxDQUFDO0FBQUMsSUFBQWdHLFFBQUEsR0FFckNqRyxJQUFJO0FBQUF2RixPQUFBLENBQUE1RCxPQUFBLEdBQUFvUCxRQUFBIn0=